# NAWA STUDIO security audit — 2026-10-15

## Scope and verified state

Inspected clean branch `arena/464f0ad7-akbar-nawasunda` at `824c6c3`, parent `267085b`,
base/main `30c4fa2`. Remote session branch matched HEAD; main was not changed. Old
SHA references in previous reports are not the current branch tips. No production
DB, deployment, DNS, environment, or old website was touched. Fixes are committed
locally on the same dedicated session branch; no push (which could trigger CI deployment).

This is a code/local integration audit, not a production penetration test or a security certification.

## Findings and remediation

| Severity | Finding and evidence at inspected HEAD | Remediation / verification |
| --- | --- | --- |
| High | Login and setup password check read a shared failure count, perform asynchronous scrypt, then overwrite the count. Concurrent requests can all see the same pre-lockout state; failures are lost. Success also clears other in-flight failures. | Atomic conditional SQL UPSERT reserves an attempt **before** hashing. Shared database budget: 5 attempts / 15 minutes, including successful/malformed attempts, without success reset. 32 concurrent reservations across 4 clients admit exactly 5; HTTP burst of 20 admits 5 and rejects 15. |
| Medium | Sessions depend only on token hash/expiry. Changing the administrator password does not revoke an already stolen session (7-day TTL). | Credential-bound session digest used consistently at issuance, lookup, and deletion. Old sessions are intentionally invalidated by this upgrade and by subsequent credential rotation. Unit test plus HTTP old-credential session rejection. |
| Medium | `/studio/setup` publicly exposes configuration diagnostics and executes a DB/schema probe after initialization. Password test remains publicly callable. Driver error filtering only removes exact strings and libsql URLs, not every possible representation. | Once a hash exists, page requires admin **before** diagnostics; password-test action checks admin itself. Driver exception text replaced with fixed message. Missing/invalid/expired/old-credential HTTP requests rejected. Hash generator still refuses once credential exists. |
| Medium | Auth, public readers and action error handlers log arbitrary exception objects, which can carry driver URLs, tokens, SQL arguments, or other sensitive data. This is an unsafe sink; actual production leakage was not observed. | Log fixed event descriptions only; no exception object. Source regression checks cover sinks and setup response. Detailed exception diagnostics are intentionally lost. |
| Medium, partially mitigated | Unconfigured deployment offers unauthenticated, expensive scrypt generation with no reservation. It cannot initialize the account, but repeated requests can exhaust workers. | Synchronous per-worker admission, max one in flight and one start / 12 seconds, release in finally. Tested concurrency and cooldown. **Not a distributed limit**; worker scaling/restarts can bypass aggregate limits. Keep bootstrap deployments access-protected. |
| High advisory, dev-only exposure | `npm audit` reports braces stack-exhaustion (GHSA-vfj7-8cjw-p6xm), propagated through micromatch / fast-glob / Next ESLint tooling (5 reported dependency nodes, one underlying advisory). | Unresolved. No public user-input path to the lint glob parser was found. Do not run lint against untrusted glob configuration. Do not apply suggested major downgrade of eslint-config-next blindly. `npm audit --omit=dev`: zero reported runtime advisories at audit time. |

## Trust boundaries and route/action inventory

- Browser values, cookies, URL slugs and FormData are untrusted. React Server Actions
  are public HTTP entry points, regardless of button visibility. Next checks action
  origins; a direct cross-origin POST with a valid session was rejected locally.
- Public `/`, `/about`, `/music`, `/music/[slug]`, `/contact`, `/experiments/lattice`
  use static or published content. Public readers explicitly select `publishedJson`;
  an unpublished sentinel release returns 404 without its draft text.
- `/studio/login` is public. `/studio/setup` is public **only before a credential is
  configured**; afterwards it requires admin, even when DB configuration is broken.
  Use host settings/CLI recovery if locked out; never remove the hash on a publicly
  accessible deployment just to enable diagnostics.
- All dashboard/editor/list/preview pages require admin on the server. Both preview
  routes guard before accessing draft records, with static non-sensitive metadata.
- `loginAction`: unauthenticated, durable attempt reservation, password comparison,
  new random session. `logoutAction`: may be invoked without auth, but deletes only
  the supplied session digest, never arbitrary sessions.
- `generateAdminHashAction`: public while hash absent; returns a hash only, never
  writes an env value/account/database. Concurrent generation cannot initialize the
  deployment. Runtime env is the owner-controlled initialization boundary.
- `testAdminPasswordAction`: now authenticated and still shares login budget.
- `saveOrPublishAction`, `saveDesignAction`, `createReleaseAction`, `saveReleaseAction`:
  each checks admin before parsing input or DB mutation. Missing/invalid/expired/
  old-credential sessions tested by direct HTTP POST, not just GET redirects.
- Store/repository code is not a Server Action endpoint. DB credentials remain
  server-side. Queries bind parameters. Publishing writes draft + published fields
  atomically in one SQL update; unpublishing clears published fields only. Failed
  validation does not write. Ensure-document before publish may leave a private
  default draft if a later write fails; no partial public publication was identified.
- Server validation restricts page slugs, release slug syntax, field lengths/types,
  design enums, artwork IDs, dates, links (`https`, no URL credentials). React text
  rendering escapes content; no `dangerouslySetInnerHTML`/eval sink was found in src.
  External release links are not fetched by the server (no identified SSRF path).
- Passwords: salted scrypt N=16384/r=8/p=1, 16-byte salt, 64-byte key,
  timingSafeEqual, bounded password length. Stored hash parameters are trusted
  operator configuration, not browser-controlled input. Invalid settings fail closed.
- Sessions: 32 random bytes, digests only in DB, server-side expiry, Secure in
  production, HttpOnly, SameSite=Lax, Path=/, 7-day lifetime. Login generates a new
  token rather than adopting browser input; sessions are bearer credentials and
  remain replayable until expiration/revocation if stolen.
- Media remains a read-only manifest; no upload endpoint exists.

## Changed files

- `login-budget.ts` (new), `store.ts`, `actions.ts`, `setup-actions.ts`: atomic admission
  and authenticated diagnostics.
- `security.ts`, `auth.ts`: credential-bound session digests; safe log messages.
- `setup-budget.ts` (new): bounded bootstrap hash work per process.
- `public.ts`, `app/studio/setup/page.tsx`: no raw exception output and setup gate.
- `tests/studio/security-audit.test.ts` (new): six regression tests (including actual
  libSQL concurrency, credential rotation, wiring/order, diagnostic/log boundaries,
  bootstrap concurrency/cooldown).
- `scripts/security-http-check.ts` (new): repeatable production-build HTTP test harness.
  Starts/stops an isolated loopback server and temporary file DB, uses random test
  credentials in memory, prints no passwords/cookies/tokens. Run after build:
  `npx tsx scripts/security-http-check.ts`.

## Executed verification

- `npm run check`: assets (3 previously documented warnings), TypeScript, ESLint,
  109 tests passed / 0 failed, production build passed.
- HTTP harness: 46 assertions passed, including all four protected mutations across
  four unauthenticated/invalid session states, preview/setup protection, active
  session positive control, logout/replay rejection, login/cookie flags, cross-origin
  rejection, private-release non-disclosure and concurrent login rate limit.
- Initial harness login probe failed because multipart form fields were serialized
  incorrectly; corrected to match installed React decoder and put FormData fields
  before root model. Positive login and authorization control now pass. No auth
  checks were weakened to accommodate the harness.
- Tracked-file signature scan (private keys/provider-token/JWT patterns) found no
  candidates; only `.env.example` among tracked env/credential-like filenames.
  This is **not** a complete historical secret scan, and cannot exclude custom or
  encoded credentials. No secret values were printed.
- Dependency advisory scan: 5 high dev-toolchain nodes; runtime-only scan zero.
- `git diff --check`: passed.

## Remaining risks / activation decision

1. Global admin attempt budget allows an outsider to deny admin logins for each
   15-minute window. It prevents concurrent bypass, not account-targeted DoS. No
   distributed IP/WAF/edge controls were configured by this audit.
2. Pre-initialization hashing has only per-worker throttling. Keep unconfigured and
   stale preview deployments restricted; old deployments can retain old env values.
3. Logout deletes the DB session under normal conditions (HTTP verified). If DB
   deletion fails, current code clears the browser cookie but the server session can
   become usable again when DB recovers, until TTL/credential rotation. This failure
   path remains unresolved; rotation is the reliable emergency revocation mechanism.
4. DB unavailable: auth fails closed, public content falls back; no remote libSQL fault
   injection, read-only token, distributed consistency, physical-device or production
   host testing was done. Expired session rows are not periodically pruned.
5. Create-release uses read-then-INSERT OR IGNORE: concurrent creates can report
   success for a slug already created by the other request. Unique key avoids duplicate
   records; misleading success remains an integrity/UX limitation, not an auth bypass.
6. Broken configuration after a hash is set blocks setup UI too (intentional fail-closed
   tradeoff). Host-side configuration recovery is required.
7. Preview/production DB separation, host access policy, HTTPS and deployment env
   were not inspected. Never share writable production credentials with untrusted previews.

**Activation:** do not activate the inspected pre-fix commit. The fixes address the
identified authentication race and revoke stale sessions, but this is not unconditional
approval for production. Before activation, restrict bootstrap/stale previews, review
login-DoS and logout-DB-failure risks, isolate production DB credentials, and verify the
actual hosting configuration. Dev-toolchain advisory is outstanding, not a demonstrated
runtime compromise. No critical unauthenticated content-write or draft-disclosure bypass
was found in the tested paths.
