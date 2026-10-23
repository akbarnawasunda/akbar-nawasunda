# ENVIRONMENT_VARIABLES

Update 2026-10-23 (D-014 + D-028). The app reads **two spellings of the same Turso database**.
`DATABASE_URL` wins when both are set; nothing has to be renamed.

## Database (Turso) — pick one spelling

```env
# Preferred (what the app, .env.example and drizzle.config.ts use)
DATABASE_URL=libsql://akbar-nawasunda-<org>.turso.io
DATABASE_AUTH_TOKEN=eyJ...

# Legacy alias (older runbook / HANDOFF). Works, same database.
TURSO_DATABASE_URL=libsql://akbar-nawasunda-<org>.turso.io
TURSO_AUTH_TOKEN=eyJ...
```

Resolver: `src/lib/turso.ts` → `readDatabaseEnv()`. Precedence and blank handling are unit-tested
(`tests/studio/turso.test.ts`).

Local development needs no token:

```env
DATABASE_URL=file:./data/studio.db
```

## Studio (admin)

```env
# scrypt hash from: npm run -s studio:hash-password   (password read from stdin, never stored)
STUDIO_ADMIN_PASSWORD_HASH=scrypt$...
```

Without it, `/studio` shows the setup screen and the public site falls back to static content — the
preview stays reviewable without exposing credentials.

## Site

```env
# Canonical URL for metadata/Open Graph. Leave unset locally; defaults to https://akbarnawasunda.my.id
NEXT_PUBLIC_SITE_URL=
```

## Not used (yet)

These appear in older docs but no code reads them. Do not add them to Vercel until a feature needs
them — an unused secret is a liability:

| Variable | Status |
|---|---|
| `AUTH_SECRET` / `AUTH_URL` | Not read. Studio sessions use their own hashed cookie (`src/studio/auth.ts`). |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Not read. There is one owner password hash, no user table. |
| `BLOB_READ_WRITE_TOKEN` | Not read. Uploads are disabled (`UPLOADS_IMPLEMENTED = false`); the planned provider is Cloudflare R2 (see `src/studio/media/storage.ts`). |

## Rules

- Never commit `.env*` values; `.env.local` is gitignored, `.env.example` documents names only.
- Keep `DATABASE_AUTH_TOKEN` server-side only; no `NEXT_PUBLIC_` prefix on any token.
- Set values per Vercel environment (Production / Preview / Development).

## Setup steps

```bash
turso db create akbar-nawasunda
turso db show akbar-nawasunda --url
turso db tokens create akbar-nawasunda

# local: write DATABASE_URL + DATABASE_AUTH_TOKEN into .env.local
npm run db:generate     # SQL migration from drizzle/schema.ts
npm run db:migrate      # apply to Turso
npm run db:seed         # verified releases (idempotent)
npm run db:seed -- --dry   # preview what would be written
```

`npm run db:seed` also creates the tables if they are missing, so a fresh database works without the
migration step. Running it twice never overwrites rows the owner has edited in the Studio.
