# TECHNICAL_SPEC — v3 Final with Vercel + Turso

## Stack Verified
- Hosting: Vercel (owner confirmed)
- DB: Turso (libSQL) — owner confirmed sudah bikin
- Framework: Next.js 14 App Router (recommended for Vercel + Turso edge)
- ORM: Drizzle ORM + libsql client (lightweight, edge compatible)
- Styling: Tailwind CSS + CSS variables for tokens
- Auth: NextAuth or custom JWT httpOnly, session table in Turso
- Storage: Vercel Blob or local /public/uploads for v1? Decision: Use Vercel Blob for production (since Vercel), fallback local for dev. Owner approve cost? Vercel Blob free tier 1GB.
- 3D: @react-three/fiber + drei dynamic import, chunk <70kb

## Architecture
- app/(public)/* SSG + ISR 60s, data from Turso via Drizzle
- app/api/public/releases → reads Turso published only
- app/api/studio/* → auth required, writes Turso
- lib/turso.ts client
- lib/auth.ts
- drizzle/schema.ts: releases, visuals, links, users, sessions

## Vercel Specific
- Edge runtime for public API? Prefer Node for Drizzle if needed, but Turso works edge.
- Image Optimization: next/image with Vercel CDN
- ISR revalidate via revalidateTag after publish

## Env Vars (see ENVIRONMENT_VARIABLES.md)
- TURSO_DATABASE_URL
- TURSO_AUTH_TOKEN
- AUTH_SECRET
- BLOB_READ_WRITE_TOKEN (if Vercel Blob)

## Performance
- Turso query <50ms, cached via ISR

## Security
- Turso token server only, never client
