# DEPLOYMENT_RUNBOOK — Vercel + Turso

## Preview Deploy (mandatory before prod)
1. Push to branch `docs/foundation` or `feat/homepage-prototype`
2. Vercel auto deploys preview URL
3. Owner checks on HP (real Android) — LCP, nav, portrait, AN mark, CTA Spotify
4. Check logs: no secret leaked, Turso connection ok
5. Approval in GitHub PR

## Production Deploy (only after approval)
1. Merge to `main` only after owner says "approve prod"
2. Vercel prod deploy auto
3. Run smoke tests: /, /music, /api/public/releases returns published only, /studio/login 401 without auth
4. Check headers: CSP present, no draft leak
5. Rollback: Vercel dashboard → Deployments → Rollback to previous if error

## Turso Migration
- Local: npm run db:generate && npm run db:migrate
- Prod: migration runs on build? Better run manually via turso CLI or Vercel build step: npm run db:migrate:prod (uses TURSO_DATABASE_URL)

## Safety
- Do NOT push .env
- Do NOT delete Turso DB without backup (turso db dump)
- Backup: daily turso db shell -> .dump > backup.sql + JSON export via /api/studio/export
