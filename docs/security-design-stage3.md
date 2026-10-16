# Stage 3 — NAWA STUDIO access-control design

Date: 2026-10-15. **Design decision, not a deployed control. Production activation remains blocked.**

## Verified starting state

- Session branch `arena/464f0ad7-akbar-nawasunda`, HEAD `c7f574b`, clean working tree.
- Local preceding security commit `15d59ec`; remote session branch still `824c6c3`.
- Local and remote main `30c4fa2`. No push, reset, merge, deployment, DNS, production DB or env changes.
- `vercel.json` specifies framework/install/build only. `next.config.ts` contains no host access gate.
- Actual Vercel project settings, plan, membership, aliases, historical URLs, deployment protection,
  bypass grants, database credentials and billing **not inspected or verified**. Connector lookup
  reported unsupported; official documentation was read, not the project dashboard.
- Existing code uses a global durable 5-attempt / 15-minute budget, credential-bound sessions,
  server-side authorization on mutations, production bootstrap disabled, and explicit failed logout.

## Threat and invariants

An unauthenticated visitor can consume the global budget without knowing the password. Raising the
limit or using an untrusted IP header trades availability for weaker brute-force protection, not a fix.
Admission must precede password-budget reservation and expensive verification. Keep the existing
password/session/database checks behind the admission boundary; gateway identity alone is not CMS auth.

Public artist GET/HEAD requests must not encounter an administrator login wall. Studio includes login,
setup, lists, editors, previews AND all sensitive Server Actions. An action is not safely identified
by its visible page path or a secret action ID. Protect action POSTs on alternate routes, encoded/trailing
slash paths, direct deployment origins and all aliases. Hiding buttons, robots exclusions, a new
hostname, or blocking only `/studio/login` does not close this boundary.

Never authorize from raw `X-Forwarded-For`, `X-Real-IP`, `Host`, an email header or a boolean
`X-Authenticated` value. A reverse proxy must either make origin access impossible or supply a
cryptographically verified, audience-bound assertion that the origin enforces itself. Shared bypass
strings embedded in clients/URLs are not an acceptable design. Do not introduce a public recovery action.

## Options compared BEFORE implementation

| Approach | Security benefit | Availability / failure behavior | Mobile compatibility | Hosting/external configuration and potential cost | Decision |
| --- | --- | --- | --- | --- | --- |
| Existing global DB budget alone | Caps password guesses across workers sharing one DB | Strangers can exhaust it; DB failure denies login; public static fallback remains | Works across changing IPs | No new service or cost; existing hosting/DB usage remains | Retain as inner defense, insufficient admission control |
| IP rules or per-worker throttles | May reduce commodity traffic | NAT/shared IP false positives; IP rotation bypass; worker restart resets memory | Static-IP allowlist unsuitable for mobile | Requires trusted edge IP attribution for even supplementary use; feature costs unverified | Reject as primary control; never use arbitrary forwarded headers |
| CAPTCHA/challenge or edge rate limit | Raises bot cost before hashing | Solver/distributed traffic can still consume global budget; provider failure can deny admins | Usually usable but browser/accessibility friction | Provider/rule support and quota must be checked; no paid service approved | Optional supplementary layer, not identity or sole mitigation |
| Native Vercel Authentication on the current combined project, All Deployments | Host identity before all requests, including action requests | Also walls off artist pages; host auth outage impacts whole site | Browser identity, no static IP needed; device test still required | Host setting and Vercel account; docs say no paid add-on for this method | Reject for combined public deployment |
| Single project with path/method-scoped identity gateway | Can preserve public reads while denying admin/unsafe requests before budget | Gateway failure must deny admin only; mis-scoped rules/direct origins bypass it | Browser SSO/MFA works conceptually with mobile; cookie/redirect tests required | Needs verified route/method policy, origin closure and identity provider; zero-cost entitlement not verified | Viable alternative only with proven coverage; no ad hoc header gate |
| Separate public read-only surface and host-protected Studio project | Small trusted boundary; all admin project requests identity-gated; public has no sensitive action surface | Identity failure blocks Studio, not public; two release/config surfaces to operate | Vercel/browser identity + Studio login, not static IP; extra login and session expiry | Separate project/configuration, possibly same repo; native auth documented on all plans; usage/eligibility/project limits still need checking | **Recommended target**; not yet implemented or configured |
| App-managed identity or new shared admission secret | Could isolate owner budget if correctly verified before login | Adds another auth/rotation/recovery system and credential-oracle/lockout risks | Could be mobile-compatible | New implementation/security maintenance; external IdP may have cost | Not smallest justified change now; do not add an emergency password |

### Vendor facts versus assumptions

Official docs retrieved during this review:
1. https://vercel.com/docs/deployment-protection — protection is project-level and authenticates
   requests before Routing Middleware. Standard Protection excludes production domains; All Deployments
   covers production and generated URLs. The docs list All Deployments on all plans and say Vercel
   Authentication for All Deployments does not require a paid add-on.
2. https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication —
   available on all plans; browser login/redirect/cookie flow; team/project/access-grant users may enter.
   Shareable links and automation bypasses are additional access paths.

This is NOT proof of the user's entitlement, current configuration, effective historical URL coverage,
commercial-plan eligibility, billing, device behavior or absence of bypasses. Native Password Protection
is a different paid feature per those docs; it is not the recommendation. No claim that a free plan
covers all project use/traffic is made. Any required paid upgrade needs explicit approval first.

## Recommended target architecture and acceptance contract

**Public surface:** anonymous artist pages and assets only. It must not execute Studio login, setup,
preview, session or write actions even if a known action ID is posted to `/` or another route. Deny
unsafe methods by default at this surface unless a separately reviewed public feature needs them.
Use least-privilege public content access: ideally only a published-content projection/snapshot, not
an administrator DB token. A read-only token to the whole current DB still exposes drafts/session
hashes on server compromise; it is not equivalent to a published-only data boundary.

**Studio surface:** separate protected project with Vercel Authentication / All Deployments as the
first admission boundary, subject to dashboard verification. Scope access to the owner's account,
enable strong host-account authentication, review grants. Keep Studio password verification, DB
budget, authorization, validation and session expiry as second-layer controls. A gateway-admitted
malicious/compromised owner can still consume the budget; this mitigates anonymous lockout, not all DoS.
Public links must lead to the public site, while private preview remains in the protected project.
Use same-origin action requests; do not broaden allowed action origins or CORS to work around routing.

**Critical implementation work still needed:** the existing app is NOT separated. Merely deploying
the same build twice leaves the public project's login/actions and writable credentials exposed.
The current public readers also depend on `getStudioConfigStatus().ready` (including an admin hash)
and initialize schema through `getReadyDb()`. Simply removing the hash or installing a read-only token
would break managed public content/schema writes, not safely implement the design. Future focused
work must separate public configuration/data access and eliminate/deny all admin dispatch on the
public surface, including pre-auth login. Do not repurpose a preview using the production writable DB.

**Host perimeter:** verify all production aliases, generated URLs, branch URLs, previews and old
production deployments. No excluded alias or share link may expose Studio actions. Remove unnecessary
share grants/bypasses; never copy an automation bypass token into a public client. Review whether
historical deployments are really covered by the effective policy, rather than relying on a label.
Public content must stay anonymous on its own surface. No static IP requirement.

**Why no runtime gate was added now:** no chosen/verified identity assertion format, issuer/audience,
origin-closure mechanism or project settings exist in evidence. An unverified proxy header or a
partial path matcher would be an additional vulnerability. Surface separation is a reviewed future
change, not a small patch to smuggle into this design task. Only documentation and public-access
regression coverage were added. No runtime security behavior changed at this stage.

## Lockout and mobile recovery runbook (operator actions, NOT performed)

1. Determine which layer is denying access: host identity, Studio budget, invalid session, or DB
   outage. Do not paste cookies, passwords, tokens, full driver errors or bypass URLs into support.
2. **Host-account lockout:** use the provider's documented account recovery with pre-enrolled
   recovery methods and offline recovery codes. Keep phone loss from destroying the only recovery
   factor. Test recovery planning without sharing codes. Do not disable deployment protection as a
   shortcut; if billing/entitlement blocks recovery, resolve it with the provider rather than open admin.
3. **Studio budget exhausted:** first contain unknown traffic through the verified host boundary on
   every reachable admin deployment. Stop repeated password tests; they consume the same budget.
   A new process/restart does not clear it. Wait until the current 15-minute fixed window expires,
   then make one deliberate login attempt. Failed reservations do not extend that window, but an
   attacker can consume the next one if containment is incomplete.
4. **Urgent recovery:** only after containment, DB health verification, and owner authentication to
   the provider control plane, an authorized operator may use a reviewed maintenance operation to
   clear the single budget row. Prefer waiting; do not expose this operation through HTTP or repeat
   it while unknown requests continue. Record the event without credentials. No reset endpoint added.
5. **Lost Studio password:** generate a new hash offline using trusted tooling; replace the configured
   value directly. Never remove it to reopen bootstrap. Follow the rotation procedure below before
   declaring recovery complete. Do not reuse an old/compromised credential.
6. **DB failure / failed logout:** no confirmed revocation until DB deletion succeeds. Keep the retry
   path, contain access via the independent host identity layer, restore DB safely, then retry logout
   and test replay rejection. If device/session theft is suspected, revoke host access and rotate
   credentials across the entire deployment inventory. Do not rely on closing a browser tab.
7. Mobile acceptance: real phone on cellular and Wi-Fi, IP changes between requests, password manager,
   identity/MFA redirect and return URL, cookie expiry, screen lock/reopen, provider logout followed
   by Studio retry, and lost-device recovery. No mandatory static IP or special browser required.
   These host/mobile acceptance tests were NOT executed here.

## Credential rotation: old deployments are a first-class risk

Existing sessions use `SHA256(JSON.stringify([token, configuredCredential]))`. New credential rejects
old sessions ONLY on workers running that new value. DB rows do not themselves express a global
credential generation. Old deployments can continue to validate existing sessions AND issue new
sessions from the old password if they retain DB access. Deleting sessions once is insufficient if
old writers can recreate them; reverting to the old hash can revive unexpired rows.

Controlled rotation sequence:
1. Inventory EVERY deployment/alias and its environment class and DB privilege. Include preview,
   generated immutable URL, rollback candidate, local tooling and long-lived requests. Contain all
   administrative traffic at the host while rotating; keep public read-only surface accessible.
2. Revoke compromised host sessions/grants first where possible. Create new administrator credential
   offline. Provision distinct least-privilege DB credentials for the retained surfaces. Never show
   values in logs or reports. No shared writable production DB access for general previews.
3. Retire or deny old administrative deployments, including direct URLs. Revoke their old DB token
   at the DB provider, not just from a new environment setting; verify denial on existing connections
   according to provider semantics. Deploy the retained Studio with new credential/token only under
   explicit approval. An env edit alone does not alter code/env in already-running deployments.
4. Once stale writers are excluded, revoke existing session records through an owner-authorized DB
   operation as defense in depth. Restore only the new admin surface, authenticate once, and verify
   old-cookie/old-password requests fail on every old and current URL. No old build rollback without
   new secrets and the same gates. Review caches/backups containing historical session/config data.
5. If old deployments cannot be enumerated/retired, or old DB credentials cannot be revoked, rotation
   is NOT complete and activation/reopening stays blocked. Emergency all-session revocation cannot
   be guaranteed during DB outage with the current single-store design.

Future alternative: a DB-backed credential-generation check could deny new sessions from stale
code that enforces it, but does NOT retrofit old binaries that lack the check. Host retirement and
DB access revocation remain necessary. New distributed state is not implemented in this review.

## Failure behavior

| Failure | Required safe behavior / present limitation |
| --- | --- |
| Unknown or absent host identity | Deny admin before login budget; public reads remain anonymous. Proposed perimeter, not yet installed. |
| Host identity service unavailable | Fail closed for admin; no bypass password. Public surface independently available. |
| Session DB unavailable | Existing auth fails closed; no writes authorized. Already-authorized/in-flight requests are not magically canceled—contain/drain during incidents. |
| Logout deletion fails | Existing code reports failure, keeps retry credential; token may revive after recovery until deletion or effective all-worker rotation. |
| Whole content DB unavailable | Current public readers fall back to static/default content; dynamic releases may disappear/404. No guarantee of unchanged content or HTTP behavior under a real network timeout. No public auth wall should be introduced. |
| Stale deployment or stale writable DB token | Block activation until retired/revoked; a new alias/new password on one deployment is insufficient. |
| Missing production admin credential | Existing bootstrap stays disabled; operator recovery only, no public initialization. |

## Local tests and limitations

- `npm run check` rerun: assets (3 documented warnings), TypeScript, lint, **112 unit/integration tests**,
  production build passed.
- Production-mode isolated HTTP harness initially passed 51 assertions. Added 8 public-access assertions:
  `/`, `/about`, `/music`, `/contact` return 200 anonymously, both normally and during a simulated
  **session-table outage**. Updated harness: **59 assertions passed**. Existing direct-action, CSRF,
  failed-logout/replay, credential binding and concurrent-login checks remain in place.
- Session-table outage is not whole-DB/network outage. No claim of real-host protection, unpublished
  access topology, latency SLA, mobile SSO, cost entitlement or remote failover testing.
- No gate implementation means no claim its tests passed. Future acceptance must assert the budget
  remains unchanged for denied host requests; prove anonymous public GETs, host-denied login and all
  mutation/preview entry points (including alternate paths and direct origins), invalid/expired/forged
  identity assertions, rotated keys, key-fetch failures, cross-worker behavior and all old URLs.
- Gate rejection must be observable via sanitized counts/statuses, not credential/session logging.

## Activation decision and required approvals

**Blocked for Studio production activation** until the owner approves an access topology, the actual
host capabilities/entitlements/cost are verified, the public/admin action and DB boundaries are
implemented and tested, all historical origins/bypasses are audited, and recovery/rotation acceptance
is exercised. Immediate global revocation during DB outage remains a requirement to explicitly accept
or design with another durable authority. This review neither disables nor gates existing public pages.
No paid purchase, project creation, DNS change, production DB or deployment is authorized by this document.
