# NAWA STUDIO: architecture plan

NAWA STUDIO is the custom content management system for the Akbar Nawasunda website.
It is built inside this project. No external CMS (WordPress, Sanity, Strapi, Contentful) is used.

**Status: Phase B-4 (activation) implemented locally.** Login, page editing, release (music)
management, homepage sections, design settings, a read-only media view, and a phone-friendly activation
page are built. Media uploads are not connected; see the Media section below.

## What the Studio will manage

| Area | Content |
| --- | --- |
| Pages and sections | Page copy and section order for each route |
| Homepage | Roles list, name treatment, hero artwork choice |
| Music | Release records: title, type, year, description, official links, artwork |
| Media | Asset library: previews, metadata, usage, variants |
| Navigation | Primary and footer links |
| SEO | Titles, descriptions, social preview per page |
| Visual settings | Supported options only (for example, whether the hero uses the backdrop) |
| Workflow | Drafts and published versions |

## Current state of the content model

- `src/content/releases.ts`: release type with an empty catalogue. Studio writes will target this shape.
- `src/config/site.ts` and `src/config/navigation.ts`: site identity and navigation.
- `src/assets/manifest.ts`: asset registry, with stable ids, roles, status, and alt text.
- `AKBAR-NAWASUNDA-ASSETS/`: original files. These stay untouched and are the source of truth.

The Studio will replace these files as its storage layer. Until then, the code is the source of truth
and changes go through pull requests.

## Storage decisions

**Database.** Implemented as libSQL, which is SQLite-compatible: local development uses a `file:` URL and
production uses a remote `libsql://` URL through the same `@libsql/client` adapter. Turso Cloud is the
candidate provider. Reasoning for SQLite-compatible storage: the content is small, documents are stored as
JSON rows, and a single administrator writes rarely. Postgres was the original plan (see the history
above) and is no longer used; a Postgres URL is refused by name on the activation page.

**Media.** Object storage. **Owner decision (2026-10-15): Vercel Blob.** Reasons: it is part of the host
already in use, and it authenticates through short-lived OIDC tokens instead of long-lived access keys
(`BLOB_STORE_ID` plus `VERCEL_OIDC_TOKEN`, injected when a store is connected to the project), so there is
no static secret to leak or rotate. Cloudflare R2 stays the fallback if the plan terms or allowances turn
out not to fit. Not configured, and nothing uploads yet.

Constraints to respect when the upload handler is written:

- A Blob store cannot change its access mode after creation. Plan two stores: a **private** one for
  originals and a **public** one for the delivered variants the site serves.
- Blobs are cached for up to a month by default and Vercel recommends treating them as immutable. Upload
  to a new pathname per version instead of overwriting, which matches the "never overwrite an original"
  rule below.
- Server-side uploads pass through a function, so the request body limit of the hosting plan applies. Check
  the current limit before accepting large originals, and downscale on the server when needed.

**Authentication.** A single administrator account: a password hashed with Node `scrypt`, with sessions
stored server-side in the database and an HttpOnly, SameSite cookie. Implemented; the hash is produced
either by the CLI script or by the activation page, and it is stored only in the host's environment
variables. No passkey support.

**Secrets.** Database URL, storage keys, and session secret go in environment variables. They are never
committed. `.env.example` lists the names only.

## Media library requirements

- Preview each asset, with the original and generated variants side by side.
- Search and filter by role, status, kind, and group.
- Metadata: alt text, decorative flag, notes, dimensions, checksum, usage.
- Upload: accept only the declared formats; verify the magic bytes, not just the extension; enforce a
  size limit; read dimensions on the server; reject non-images.
- Replace safely: upload to a new key, switch references, keep the previous version for rollback. Never
  overwrite an original in place.
- Selection: pick an asset for a page section or release, from the library, with a usage list.
- Variants: generate responsive WebP/AVIF sizes on the server. Use the optimized originals already in the
  library until that pipeline exists.

## Authorisation rules

- Every mutation is authorised on the server, in the route handler or server action. Client-side checks are
  for display only.
- Public routes read only published content. Drafts are never rendered on public pages.

## Blockers (needed from the owner before the remaining work)

1. Database: a libSQL database with a write token. The owner has not created one yet.
2. Storage: a Vercel Blob store (private for originals, public for variants), chosen but not created.
3. Hosting: resolved. The site is deployed from `main` to Vercel.
4. A browser pass over the editors at phone width. Not done yet; it needs a real browser, not the build
   environment.

## Order of implementation, and where it stands

1. Read-only Studio shell behind authentication, showing the asset manifest. **Done (B-2).**
2. Release editor with draft and publish states. **Done (B-3).**
3. Page and section editor, with the homepage as the first page. **Done (B-3).**
4. Activation tooling so the owner can switch the Studio on from a phone. **Done (B-4).**
5. Browser and phone-width verification of the editors against a real database. **Open.**
6. Media library: upload with validation and variant generation, then selection and metadata editing.
   **Open, blocked on the storage store.**

## Status: first functional slice (B-2)

Implemented and verified locally:

- Protected `/studio` routes. Every protected page calls `requireAdmin()` on the server; unauthenticated requests redirect to `/studio/login`. Auth fails closed (unconfigured or database error = not admin).
- Single-admin login: password hashed with Node `scrypt` (`npm run studio:hash-password`), random session token stored as SHA-256, HttpOnly / SameSite=Lax cookie (Secure in production), 7-day expiry, DB-backed lockout after 5 failures in a 15-minute window.
- Mutations via Server Actions (`login`, `logout`, `saveOrPublish`). Each re-checks the session on the server and validates input server-side (`validation.ts`).
- About page content: draft save, publish (atomic batch), drafts never read by the public site, draft preview at `/studio/preview/about`.
- Public `/about` shows published content when present; otherwise the static "Biography pending" fallback. A failed read returns null, so the fallback is shown.
- Dashboard shows real status; Media page lists repository assets read-only and states that uploads are not connected.

Not implemented (by design, this slice): uploads and object storage, pages other than About, music/release/navigation/SEO/design editors. The content model (`content-model.ts`) is extensible for these.

Storage: Turso/libSQL via `@libsql/client` (local `file:` and remote `libsql://` use the same adapter). Tables: `studio_sessions`, `studio_pages`, `studio_login_failures`; created idempotently at first use.

Environment variable names: `DATABASE_URL`, `DATABASE_AUTH_TOKEN` (remote only), `STUDIO_ADMIN_PASSWORD_HASH`. Values are never committed or displayed.

Setup for the site owner (on a phone or desktop):
1. Create a Turso database (not done by the agent; requires the owner's account).
2. Run `read -rs PW && printf '%s' "$PW" | npm run -s studio:hash-password && unset PW` locally; copy the output into `STUDIO_ADMIN_PASSWORD_HASH`.
3. Set `DATABASE_URL` and `DATABASE_AUTH_TOKEN` in the hosting dashboard, then deploy.
4. Open `/studio/login` and sign in.

Tests: `npm test` (pure modules: config, password, content model, validation, session rules). Browser flow checks were run against `next start` with a local file database (see the final report).

## Status: content management (B-3)

Implemented and tested locally. Each item below is in code and covered by `npm test` unless marked otherwise.

**Storage model.** All editable documents live in the existing `studio_pages` table, one row per key:
`about`, `home`, `design`, and `release:<slug>`. Each row has `draft_json` and `published_json`. Public routes
read only `published_json`. No schema migration was needed.

**Pages (`/studio/pages`).** `about` and `home` use structured sections, not free HTML. Section types:
`heading`, `paragraph`, and (homepage only) `music-list`. Each section has a visibility flag. Save draft is
private. Publish is an explicit, separate action. Preview at `/studio/preview/<slug>` shows only what the
public site would show and reports how many sections are hidden. Public `/about` falls back to the static
"Biography pending" text when nothing is published.

**Homepage.** The hero is code-owned and cannot be edited. The builder adds optional blocks below it. Order and
visibility are controlled, and the music-list block shows published releases only.

**Music (`/studio/music`).** Create, edit, draft, and publish release records: title, slug, type, description,
external links, SEO, and artwork. Rules:
- Links must be `https://`, without credentials, with a label. `javascript:`, `http:`, and `data:` are refused.
- A release date is stored and shown only when "date verified" is ticked. Unverified dates are never published.
- Artwork can only be picked from the asset manifest, and only assets with role `release-artwork` and status
  `approved` are offered. No such asset is approved yet, so the picker is empty. Nothing is invented.
- Public `/music` and `/music/[slug]` show published releases. With none, they show the "Catalogue pending"
  state. Static fallback data is still used when the database is unavailable.
- Preview at `/studio/preview/release/<slug>`.

**Design (`/studio/design`).** Closed options only: accent (`signal`, `bone`, `cobalt`) and title case
(`uppercase`, `as-written`). Values are validated on the server, and the public site receives them only as
`data-accent` and `data-title-case` attributes on the layout wrapper. No CSS input exists. Accent affects hover,
focus, and selection only.

**Media (`/studio/media`).** Read-only. It lists repository assets and shows storage status with the variable
names only. **Uploads are not implemented and are not offered.** `src/studio/media/storage.ts` reports
"not connected" until the R2 integration is written and configured.

### Setup needed to activate uploads (not done; needs owner approval)

1. A storage provider account. Cloudflare R2 is the candidate. Its pricing (free tier and paid overage)
   must be checked against the official Cloudflare documentation before a decision. Some figures found
   during research came from third-party aggregators and are not verified.
2. A private bucket for originals and a public bucket or custom domain for delivered variants.
3. Environment variables (names only): `MEDIA_R2_ACCOUNT_ID`, `MEDIA_R2_BUCKET`, `MEDIA_R2_ACCESS_KEY_ID`,
   `MEDIA_R2_SECRET_ACCESS_KEY`, `MEDIA_PUBLIC_BASE_URL`.
4. The upload handler itself: magic-byte checks, size limit, server-side dimensions, and a new key on every
   replace. Only then set `UPLOADS_IMPLEMENTED` to true and add the upload UI.

### Database setup needed

- A libSQL database. Turso Cloud is the candidate, and the database must be the **libSQL** engine, not
  the newer Turso Database engine: `@libsql/client` speaks libSQL. In the CLI this is the difference
  between `turso db create <name>` (libSQL) and `turso db create <name> --tursodb`.
- The token needs write access, because the schema is created on first use.
- No remote database was created or tested by the agent. Until one exists, `/studio/setup` reports the
  missing pieces and the public site keeps showing its current content.
- Walkthrough for the owner, phone-first: `docs/activate-nawa-studio.md`.

### Tests and checks

- `npm run check` runs the asset check, typecheck, lint, 86 tests (`tests/studio/*`), and the production build.
- Tests cover config, sessions and lockout rules, content and design parsing, validation (page sections,
  release fields, verified dates, links, slugs, artwork ids), media status, activation checks (database URL
  shapes, hash shapes, host masking, secret redaction, password rules, checklist outcomes), and repository
  behaviour on a temporary libSQL file database: drafts not public, atomic publish, unpublish keeping the
  draft, release listing, and persistence after reopening the connection.
- Smoke test of `next start` with a temporary database: public routes return 200 with correct fallbacks, and
  every `/studio/*` route redirects to login without a session.
- Browser checks: see the mobile audit section below. A headless Chromium was used on 2026-10-15; a physical
  phone and a real mobile browser have still not been used.


## Status: activation tooling (B-4)

Implemented to make switching the Studio on possible from a phone, without a terminal, and to make a
misconfigured deployment explain itself.

**`/studio/setup`.** Public, like the sign-in page, because it has to be reachable before the Studio works.
It shows one row per requirement and the row text never contains a secret value:

- `DATABASE_URL`: missing, local file, remote libSQL, or refused by name (a Postgres string is called out
  specifically, because that was the original plan and it is the easiest mistake to make).
- `DATABASE_AUTH_TOKEN`: required for remote URLs, not needed for a local file.
- `STUDIO_ADMIN_PASSWORD_HASH`: presence plus a format check, which catches a value that was cut off while
  copying.
- **Database connection and tables**: a real probe. It connects, applies the idempotent schema, and reports
  whether all three tables exist. Errors are shortened to one line and every secret (the URL, the token) is
  stripped out of the text before it is displayed.

**Password hash generator, on the same page.** Hashing runs on the server with the same `scrypt` code as the
sign-in path. The tool is offered only while `STUDIO_ADMIN_PASSWORD_HASH` is unset, so it disables itself as
soon as the Studio is activated; the action refuses to run in that state even if the form is submitted
directly. Passwords must be at least 12 characters and typed twice.

**Password check.** Verifies a typed password against the stored hash without creating a session, and shares
the sign-in lockout counter, so it cannot be used to guess faster than signing in could.

**Deployment notes the page states plainly.** Environment changes only reach a new deployment, so it tells
the owner to redeploy. A `file:` database is reported as a problem in production, because a serverless host
does not keep the file.

Walkthrough: `docs/activate-nawa-studio.md`. Tests: `tests/studio/setup.test.ts`.

## Status: mobile audit and fixes (B-5)

**How it was checked.** Headless Chromium 153 with mobile emulation (touch, device scale factor 2, mobile
viewport), against a production build (`next start`) with a seeded file database, at the widths **320, 360, 390
and 430px**. Per page the harness measured the real document and element geometry (not the CSS source):
horizontal overflow and scroll containers, elements painted past the viewport edge, text spilling out of its own
box, tap-target sizes, field font sizes, table behaviour, notices past the edge, computed text/background
contrast against WCAG AA, long unbreakable tokens, navigation reachability, and where keyboard focus lands. It
also drove the real flows: sign-in through the form at 390px, a wrong password at 320px, the activation page and
its hash generator on an unconfigured deployment at 320px, and a refused release save at 320px.

Pages covered: `/studio/login`, `/studio/setup`, `/studio`, `/studio/pages`,
`/studio/pages/about`, `/studio/music`, `/studio/music/new`, `/studio/music/<slug>`, `/studio/design`,
`/studio/media`, `/studio/preview/about`, `/studio/preview/release/<slug>`, plus the public `/about` and
`/music/<slug>` as a regression check for the shared stylesheets.

**Problems found and fixed.** Every number below was measured in the browser before the fix.

| Problem | Measured before | Fix |
| --- | --- | --- |
| The Studio shell grew to its header's content width, so every `/studio` page scrolled sideways | document 543px wide at a 320px viewport | explicit `grid-template-columns: minmax(0, 1fr)` on `.shell`, `min-width: 0` on the header, navigation and main column |
| Navigation labels were painted on top of each other | six overlapping labels at 320px | `flex: none` on the links. The explicit `min-width: 44px` was replacing the flex item's automatic minimum size, so the boxes shrank below their `nowrap` labels while the text overflowed |
| Navigation was cramped into one row with the brand and Sign out | strip started mid-page | on phones the header wraps into two rows: brand and Sign out, then the navigation across the full width, with scroll snapping |
| Studio tables were unusable at phone widths | 4 columns / 993px content in a 285px box | rows become stacked cards below 720px, each cell labelled from its `data-label`; above 720px the table layout returns. A first attempt with a horizontally scrolling box was rejected: `min-width: max-content` inflated the document to 912px and the full-page screenshot came out 912px wide |
| Long values widened blog-style content | a release paragraph reached 833px at a 320px viewport (a 172-character URL) | `overflow-wrap: anywhere` on the content text blocks plus `min-width: 0` on their grid containers, and a `body` fallback. Also affects the public `/about` and `/music/<slug>` pages, which had the same latent bug |
| The public header brand link was too small to tap | 137.8 x 18px on every public page | `min-height: 44px` with centred content |
| The skip link was slightly under the target size | 152 x 40px | `min-height: 44px` |
| Long URLs, hashes and errors had no wrap rule in the Studio | asset file names and slugs forced tables wide | `overflow-wrap: anywhere` on the Studio main column and tables, plus the existing `.codeBlock` wrap rule for the generated password hash |

**Rules to keep (they are covered by `tests/studio/mobile-layout.test.ts`).** The shell grid column stays capped;
the studio navigation keeps `min-width: 0`, `flex: none` on links and its own phone row; tables keep the
`data-label` cells and the stacked-card block; interactive controls keep `min-height: 44px`; text fields keep the
16px minimum that stops iOS Safari from zooming on focus; content text keeps its wrap and shrink rules. The test
file reads the stylesheets and page sources, so removing a rule fails `npm test` instead of silently reintroducing
the bug.

**Not verified.** A real mobile browser on a physical device (iOS Safari and Android Chrome were not available),
the on-screen keyboard behaviour and viewport resizing it causes, touch gestures against the navigation snap, and
device rotation. The audit was of a seeded local database, so real production content lengths may differ. A
Vercel preview of this branch was not deployed.
