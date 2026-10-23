# DEPLOYMENT_RUNBOOK

Production target: **Vercel** (Next.js 16 App Router) + **Turso** (libSQL). Everything below has been
rehearsed locally against a production build; the one step that cannot be rehearsed from this
sandbox is the Vercel upload itself.

Phase 8 QA status: **green** — see `PHASE_0_AUDIT_AND_PHASE_1.md` §20 for the measured numbers.

---

## 0. What ships

| Piece | Where | Notes |
|---|---|---|
| Site (App Router) | Vercel, Node runtime | 6 public routes + 404, `/studio` behind a password |
| Database | Turso (libSQL) | optional; without it the site falls back to the verified static catalogue |
| Images | `/public` | no image CDN, no runtime optimizer in the path — the `<picture>` elements point at exact files |
| Press kit | `/public/epk/akbar-nawasunda-epk.zip` | 999,465 B, served as a static file |
| Artwork | `/public/assets/covers/*` | resolved at render time by `src/content/covers.ts` |

---

## 1. Environment variables (Vercel → Project → Settings → Environment Variables)

Set the same names in **Production** and **Preview**. Values are never committed.

| Name | Required | Scope | What it is |
|---|---|---|---|
| `DATABASE_URL` | recommended | server | `libsql://<db>-<org>.turso.io`. Local dev may use `file:./data/studio.db` |
| `DATABASE_AUTH_TOKEN` | with `libsql://` | server | Turso token, never `NEXT_PUBLIC_` |
| `STUDIO_ADMIN_PASSWORD_HASH` | recommended | server | `scrypt$…` from `npm run -s studio:hash-password` |
| `NEXT_PUBLIC_SITE_URL` | recommended | public | `https://akbarnawasunda.my.id`; leave unset and the code defaults to it |
| `PREVIEW_FRAMING` | **never in Production** | preview only | `1` widens CSP `frame-ancestors` by `https://*.e2b.app` so the sandbox preview can be embedded. Do not set it on Vercel. |

`TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` are accepted as aliases of the first two; set one pair,
not both. Full list and the “not used yet” table: `ENVIRONMENT_VARIABLES.md`.

Secrets are read server-side only. Nothing in `src/` prefixes a token with `NEXT_PUBLIC_`.

---

## 2. First deploy

```bash
# 1. database (skip if the Studio stays off for launch)
turso db create akbar-nawasunda
turso db show akbar-nawasunda --url          # → DATABASE_URL
turso db tokens create akbar-nawasunda       # → DATABASE_AUTH_TOKEN

# 2. schema + verified seed (idempotent; never overwrites Studio edits)
DATABASE_URL=... DATABASE_AUTH_TOKEN=... npm run db:seed

# 3. admin password hash (reads the password from stdin, prints the hash)
npm run -s studio:hash-password              # → STUDIO_ADMIN_PASSWORD_HASH

# 4. deploy
vercel link
vercel env pull .env.local                   # or paste the variables in the dashboard
vercel --prod
```

`vercel build` runs `next build`, which type-checks the whole repo including `tests/`.

---

## 3. Release checklist

Run from a clean checkout of the release commit:

```bash
npm ci
npm run check          # assets · typecheck · lint · 107 tests · 8 DB tests · build
npm run a11y           # axe-core, 7 routes × 2 widths → must print 0 violations
npm run covers:sleeves # only if a release was added without artwork
```

Then, against the preview URL (not localhost):

```bash
npx lighthouse <preview-url> --preset=desktop --output=html --view
npx lighthouse <preview-url> --throttling-method=devtools --output=html --view
```

Expected (measured on this build, §20):

| Profile | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Desktop preset | 100 | 100 | 100 | 100 |
| Mobile, DevTools throttling | 99 | 100 | 96 | 100 |

`best-practices` is 96 rather than 100 only because the brand sets mono labels at 11 px and
Lighthouse's `font-size` heuristic wants 12 px. That is a design decision (D-077), not a defect.

---

## 4. Smoke test after deploy (5 minutes)

1. `/` returns 200; the hero photo paints before any scrolling; nav is 64 px and pushes to `/music`,
   `/visuals`, `/artist`, `/epk`.
2. `/music` lists six releases; each tile shows a sleeve, none is an empty box.
3. `/music/cinta-terbuang` shows the track page; `/about` 308-redirects to `/artist`.
4. `/epk` downloads `akbar-nawasunda-epk.zip` (999,465 B).
5. `/nope` renders “Sinyal hilang” and the blue strip, with a 404 status.
6. `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest` resolve.
7. Response headers include CSP, `X-Content-Type-Options: nosniff`, HSTS, `Referrer-Policy`:
   `curl -sI https://akbarnawasunda.my.id/ | grep -Ei 'content-security|x-content|strict-transport|referrer'`.
8. `/studio` shows the login screen; sign in, open a page, save a draft, confirm the public site does
   **not** show the draft, publish, confirm it does.
9. The 404 page and Studio do not appear in `/sitemap.xml`.

---

## 5. Rollback

- **Vercel**: Deployments → previous deployment → “Promote to Production”. No rebuild, seconds.
- **Database**: `npm run db:seed` never deletes; to undo a published page, edit it in Studio and
  publish the previous text (the draft/published rows are separate).
- **Artwork**: `git revert` the commit that added `public/assets/covers/<slug>.webp`; the resolver
  falls back to the generated sleeve automatically.

---

## 6. Notes for the reviewer

- `/privacy` does **not** exist and must not be created by an agent — the owner writes that text.
- `main` is only merged after the owner approves the preview. The branch under review is
  `arena/e02160ef-akbar-nawasunda` (PR #3).
- Build warnings: Turbopack prints one “dynamic filesystem access causes tracing of the whole
  project” warning for `src/content/covers.ts`. It is expected — artwork is resolved with
  `fs.existsSync` at render time so the owner can drop a file in without a rebuild — and it is why
  the deployment bundle includes `public/`.
