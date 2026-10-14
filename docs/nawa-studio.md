# NAWA STUDIO: architecture plan

NAWA STUDIO is the custom content management system for the Akbar Nawasunda website.
It is built inside this project. No external CMS (WordPress, Sanity, Strapi, Contentful) is used.

**Status: planned, not implemented.** No dashboard, login, upload, or publish action exists yet,
because the infrastructure they depend on is not configured. Shipping placeholder controls would
be misleading, so none were added.

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

**Database.** Postgres, using a managed free-tier provider (for example Neon). Reasoning: relational
data (releases, pages, sections, drafts), standard tooling, and easy export. It needs a connection string
from the owner. Not configured.

**Media.** Object storage with an S3-compatible API (for example Cloudflare R2 or Supabase Storage).
Reasons: originals must be kept, files need serving through a CDN, and egress cost matters. Originals go
to private storage; delivered variants go to public storage. Not configured.

**Authentication.** A single administrator account, with sessions stored server-side in the database
and an HttpOnly, SameSite cookie. Credentials are a hashed password or a passkey, depending on the owner's
preference. Not configured. No authentication has been implemented.

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

## Blockers (needed from the owner before implementation)

1. Database: a Postgres connection string, or approval to create a free-tier project.
2. Storage: a bucket and access keys, or approval to create one.
3. Administrator login method: password or passkey, and the account email.
4. Hosting: confirmation of the platform for the Studio and for the preview deployment.

## Suggested order of implementation

1. Read-only Studio shell behind authentication, showing the asset manifest.
2. Media library: list, search, and metadata editing, writing to the database.
3. Release editor with draft and publish states.
4. Upload with validation and variant generation.
5. Page and section editor, with the homepage as the first page.

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
