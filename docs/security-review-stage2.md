# Stage-two security review — 2026-10-15

## Verified state / scope

Started on `arena/464f0ad7-akbar-nawasunda`, HEAD `15d59ec`, parent `824c6c3`,
clean working tree. Remote session branch was `824c6c3`, main `30c4fa2` (verified
using ls-remote). Prior security patch was local only. No existing changes discarded.
This review covers only bootstrap, session revocation during outages, login budget
abuse, and the ESLint dependency advisory. Local isolated DBs only. No push/deploy.

## Findings, evidence, smallest fix and activation decisions

### 1. Bootstrap: confirmed resource exposure, not account takeover (Medium)

The generator does not initialize an account or write environment values. Concurrent
calls can generate different hashes but cannot claim ownership; only an operator
installing a credential in the host initializes the deployment. No initialization
race/account-takeover vulnerability was found.

Confirmed limitation: every fresh `createSetupHashBudget()` accepts a request;
workers and restarts reset the per-process throttle. Incomplete production env with
no password hash enabled the public generator. An absent database cannot provide a
durable global throttle. Adding a new bootstrap secret/storage would be a larger
change and another secret to manage.

**Fix:** browser hashing is permitted only in explicit `NODE_ENV=development` with
no configured credential. Production, test and unspecified runtimes deny it at the
Server Action boundary before scrypt. Production setup without a credential returns
a generic notice before configuration diagnostics. Once a credential exists,
`requireAdmin()` still precedes diagnostics, even with an incomplete/unavailable DB.
There is no production override flag. Phone-only public bootstrap is intentionally
removed; use the existing local generator/CLI and host-controlled env setup.

Evidence: policy matrix (missing/blank/present hash and runtimes), source wiring test,
and two simultaneous production-mode server processes (one missing credential, one
missing credential AND database URL), each rejecting 20 concurrent generator POSTs.
Both processes were also started again in fresh runs; no allowance reset occurred.
No returned hashes/password fields in unconfigured production checks. Existing HTTP
coverage checks configured generator denial and protected diagnostics.

**Activation:** pre-fix public production bootstrap is a blocker for this review.
Patched path removes that exposure regardless of worker count/restart. Development
servers must remain trusted/private; existing development throttle is not distributed.
Retire older deployments still running the pre-fix code. Deployment with a missing
credential remains unable to administer content by design.

### 2. Logout outage: confirmed revocation gap (Medium, partial remediation)

Before this change, delete failures were swallowed, cookie deleted and logout
redirected as though successful. A copied bearer token remained in the DB and could
work after recovery. Reproduced with an actual SQLite read-only write failure.

**Fix:** `revokeThenClear` returns failure without clearing the retry cookie when DB
revocation fails. Missing configuration with a token also fails. Logout redirects to
an explicit “Sign-out not confirmed” page with retry, not a success-looking login.
That page bypasses the usual authenticated redirect so it remains visible after
recovery. On successful deletion cookie clearing still follows revocation.
No raw DB exception is logged or displayed.

Verification:
- Real local DB with `PRAGMA query_only=ON` rejects DELETE; cookie-clear callback
  does not run. After recovery the same row is still active (explicitly asserted),
  then retry deletes it and repeated logout is idempotent.
- Production HTTP harness temporarily renames its isolated session table to simulate
  unavailable session storage. Logout redirects to `logout=failed`, sends no cookie
  deletion, and protected requests fail closed. Restoring the table proves replay
  works until retry. Retry deletes the session and subsequent replay fails.
- Credential rotation changes the session lookup digest; expired, invalid, and old-
  credential sessions remain rejected in unit/HTTP coverage from stage one.

**Not fixed / fundamental limitation:** no globally durable revocation can be promised
while the only revocation store is unavailable. This patch fixes false confirmation,
not immediate offline revocation. No process-local denylist is presented as a solution:
it would fail across workers/restarts. Lost retry cookies do not revoke copied tokens.
Emergency credential rotation must reach ALL workers/deployments; old deployments
with old credentials can still validate old sessions. Reverting to an old credential
can also revive unexpired rows associated with it; never reuse a compromised credential.

**Activation:** conditional blocker if immediate global logout during an outage is
required. For this single-admin deployment, accept only with explicit failed-logout/
retry and all-deployment emergency-rotation procedures; not an unconditional approval.

### 3. Global login lockout: confirmed availability abuse (Medium)

Five strangers' requests exhaust the shared 15-minute budget before a valid-password
owner can attempt verification. This is reproduced against the real DB. Malformed
requests also consume reservations; counting attempts is intentionally conservative.
The attacker can repeat on each new fixed window. Existing authenticated sessions are
not invalidated by budget exhaustion.

Four independent Node processes against the same isolated file DB attempt 32
reservations and collectively receive exactly five. A fresh fifth process receives
zero; restarting/scaling processes does not reset the shared DB state. Boundary
expiry allows a new reservation. Existing production HTTP burst test also passes.
A first file-DB multiprocessing test encountered SQLite write contention; test workers
now set `busy_timeout=5000`. This is a harness setting, not a production change.
Production contention remains fail-closed (no successful verification on DB error).

**No auth-algorithm change made.** Raising limits/removing the global cap permits more
brute force. Trusting arbitrary X-Forwarded-For invites bypass. Per-process counters
break on scaling. Remote workers must share the SAME database; separate file DBs do
not share limits. Local multi-process tests do not certify remote libSQL consistency.

Smallest practical mitigation: restrict admin/login/action traffic at a trusted host
boundary to the owner (access gateway/VPN/host access control); otherwise apply
trusted edge rate limiting plus the existing durable global cap. Gate action POSTs,
not only `/studio/login` GET: Server Actions can be invoked through other app routes.
Do not log sensitive headers or set an untrusted header-derived limiter. No hosting
configuration was changed in this review. The application does not provide an owner
bypass/recovery endpoint that would weaken brute-force protection.

**Activation:** unresolved availability blocker if reliable public admin login under
hostile traffic is required. Requires a trusted access boundary/accepted availability
risk before activation; no demonstrated content-write/authentication bypass.

### 4. Dependency advisory: confirmed parser failure, dev-only path

Affected chain:
`eslint-config-next@16.4.0 -> @next/eslint-plugin-next@16.4.0 -> fast-glob@3.3.1
 -> micromatch@4.0.8 -> braces@3.0.3`.

Advisory: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm (High), stack exhaustion
through deeply nested patterns, vulnerable `<=3.0.3`.
GitHub advisory API returned `first_patched_version: null`; registry `npm view braces
version` returned `3.0.3`. Thus no published compatible patched braces version was
available at review time. `npm audit` suggests eslint-config-next 14.2.35 (major
downgrade); not an appropriate blind fix for a Next 16 project.

Isolated child process, 5-second timeout, braces called with 4,000 nested brace pairs:
`RangeError` reproduced. A 10,000-pair probe instead hit the library input-length
SyntaxError guard, so length guarding alone does not prevent stack exhaustion.
Audit reports five high dependency nodes, one underlying advisory. No runtime
user-input path to this lint-only parser was found; the prior runtime advisory scan
was zero. No dependency/package-lock changes were made.

**Activation:** not a demonstrated runtime blocker. CI/builds processing untrusted
patterns/configuration need isolation, resource limits and review. Track the upstream
fix and recheck registry/advisory before pinning an override. No regression asserting
that the dependency MUST remain vulnerable was added to the standard suite.

## Changes and verification

Files: new `bootstrap-policy.ts`, `revoke-session.ts`, `security-stage2.test.ts`;
updated setup page/action, auth/logout action, login failure UI, isolated HTTP harness,
activation docs and this report. No schema changes, paid services or new dependencies.

Executed:
- `npm run check`: asset validation (3 existing documented warnings), TypeScript,
  ESLint, **112 tests passed / 0 failed**, production build.
- Normal configured HTTP harness: **51 assertions passed**, including DB outage /
  recovery / retry, credential rotation and invalid/expired sessions.
- Unconfigured production harness: two simultaneous workers, **5 assertions each**,
  **20 concurrent generator POSTs denied each**; also rerun in fresh processes.
- `git diff --check`: passed.
- npm registry, dependency tree, npm audit and GitHub advisory queried; no upgrades.

Reproduce after build:
```
npx tsx scripts/security-http-check.ts
SECURITY_TEST_UNCONFIGURED=1 SECURITY_TEST_PORT=3198 npx tsx scripts/security-http-check.ts
SECURITY_TEST_UNCONFIGURED=1 SECURITY_TEST_NO_DB=1 SECURITY_TEST_PORT=3199 npx tsx scripts/security-http-check.ts
```

All credentials are random test values in memory, never printed. No real remote DB,
production data, credentials, DNS or env was accessed/modified. HTTP outage simulation
is missing-table/local read-only behavior, not a real network partition or remote
failover. Tests passing do not imply production activation is safe without the
operational decisions identified above. Previous audit report describes the previous
commit; this report supersedes it for these four areas only.
