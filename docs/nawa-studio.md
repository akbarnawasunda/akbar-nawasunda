# NAWA STUDIO: architecture plan

NAWA STUDIO is the custom content management system for the Akbar Nawasunda website.
It is built inside this project. No external CMS (WordPress, Sanity, Strapi, Contentful) is used.

**Status: Phase 6 — implemented and exercised end to end against a real database.** Password login,
server-side sessions, page editing (`/studio/pages/about` → `/artist`), release management, homepage
sections, design settings and a read-only media view are built. Media *uploads* are still not
connected; artwork goes in by file name convention instead (see "Release artwork" below).

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

- `src/content/releases.ts`: six verified releases. These are also seeded into the database (D-018).
- Stored documents live in one table, `studio_pages`, keyed by slug (`about`, `home`, `design`,
  `release:<slug>`), each with a draft JSON and a published JSON. Drafts are never read by the public
  readers in `src/studio/public.ts` (D-025).
- `src/config/site.ts` and `src/config/navigation.ts`: site identity and navigation.
- `src/assets/manifest.ts`: asset registry, with stable ids, roles, status, and alt text.
- `AKBAR-NAWASUNDA-ASSETS/`: original files. These stay untouched and are the source of truth.

The Studio will replace these files as its storage layer. Until then, the code is the source of truth
and changes go through pull requests.

## Storage decisions

**Database.** Turso (libSQL) — what the owner chose on 2026-10-23; the earlier Postgres/Neon plan in
this file is obsolete. Local development uses `file:./data/studio.db`, which the same client and the
same SQL serve. Connection settings are read through `src/lib/turso.ts`, which accepts both
`DATABASE_URL`/`DATABASE_AUTH_TOKEN` and the older `TURSO_*` spellings (D-014, D-028). The schema is
applied idempotently at boot, and `drizzle/` holds the declarative schema plus the generated migration.

**Media.** Object storage with an S3-compatible API (for example Cloudflare R2 or Supabase Storage).
Reasons: originals must be kept, files need serving through a CDN, and egress cost matters. Originals go
to private storage; delivered variants go to public storage. Not configured.

**Authentication.** One administrator password, stored only as a scrypt hash
(`STUDIO_ADMIN_PASSWORD_HASH`, generated with `npm run studio:hash-password`). Sessions are random
tokens whose SHA-256 hash is stored in `studio_sessions` with an expiry; the browser holds the raw
token in an HttpOnly, SameSite=Lax cookie, `Secure` in production. Failed logins are rate-limited
(five attempts per fifteen minutes, `studio_login_failures`). Every server action re-checks the
session; a page render does too, via `requireAdmin()`.

**Secrets.** Database URL, storage keys, and session secret go in environment variables. They are never
committed. `.env.example` lists the names only.

## Release artwork (what the owner does today)

Uploads are not connected, so artwork is a file convention rather than an upload: put a square file
named after the release slug in `public/assets/covers/` (`cinta-terbuang.webp`). `src/content/covers.ts`
resolves it at request time, cards and the release page use it, and nothing is written to the database.
`/studio/media` lists every release with the exact filename it is waiting for. In production the file
ships with the next deploy, like any other asset.

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

Tests: `npm test` (pure modules) plus `npm run test:db`, which drives the real path — draft saved,
public reader blind to it, publish, draft-after-publish, session hash, password verify — against a
temporary libSQL file. `npm run check` runs both. The whole flow was also walked in a browser:
login → wrong password rejected → editor → save draft → `/artist` unchanged → preview → publish →
`/artist` shows the bio → sign out → `/studio` guarded again.

## Status: content management (B-3)

Implemented and tested locally. Each item below is in code and covered by `npm test` unless marked otherwise.

**Storage model.** All editable documents live in the existing `studio_pages` table, one row per key:
`about`, `home`, `design`, and `release:<slug>`. Each row has `draft_json` and `published_json`. Public routes
read only `published_json`. No schema migration was needed.

**Pages (`/studio/pages`).** `about` (route `/artist`, label "Artist") and `home` use structured
sections, not free HTML. Section types: `heading`, `paragraph`, and (homepage only) `music-list`. Each
section has a visibility flag. Save draft is private. Publish is an explicit, separate action. Preview
at `/studio/preview/<slug>` shows only what the public site would show and reports how many sections
are hidden. On `/artist`, the document's `lead` is the one-line positioning under the name and the
paragraph sections are the long bio; with nothing published, the page falls back to its verified line
and the `[NEEDS OWNER]` list.

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

**Design (`/studio/design`).** Closed options only: accent (`signal`, `icy`, `bone`) and title case
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

- Local: `DATABASE_URL=file:./data/studio.db`. No token is needed.
- Production: a libSQL database (for example Turso) must be created by the owner. Set `DATABASE_URL` and
  `DATABASE_AUTH_TOKEN`. The schema is applied idempotently on first use.
- No remote database was created or tested by the agent.

### Tests and checks

- `npm run check` runs the asset check, typecheck, lint, 65 tests (`tests/studio/*`), and the production build.
- Tests cover config, sessions and lockout rules, content and design parsing, validation (page sections,
  release fields, verified dates, links, slugs, artwork ids), media status, and repository behaviour on a
  temporary libSQL file database: drafts not public, atomic publish, unpublish keeping the draft, release
  listing, and persistence after reopening the connection.
- Smoke test of `next start` with a temporary database: public routes return 200 with correct fallbacks, and
  every `/studio/*` route redirects to login without a session.
- **Not run:** browser end-to-end tests of the editors and a 390px mobile check. No browser could be launched in
  the build environment. These remain open.

