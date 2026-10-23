# TECHNICAL_SPEC

## Audit Required Before Coding
1. Check repo akbarnawasunda.my.id — framework? package.json? Is Next.js? Tailwind?
2. Hosting? Vercel?
3. Existing DB? Env vars?

## Proposed Minimal Architecture (if no repo or static)
- Framework: Next.js 14 App Router (if owner allows) — for routing + image optimization
- Styling: Tailwind + CSS variables for tokens
- Content: JSON / MDX + local uploads for v1 to avoid paid DB, migrate to Turso/Supabase later if needed
- 3D: @react-three/fiber + drei only if bundle <70kb extra, else custom SDF Canvas
- Auth Studio: NextAuth or simple JWT httpOnly, password hashed bcrypt
- Storage: local /public/uploads for v1 + R2/S3 option later
- No heavy CMS like Sanity unless owner approves cost

## Rendering
- Public pages: SSG where possible, ISR for releases
- Studio: SSR + client components, no cache

## Security Headers
- Content-Security-Policy, X-Frame-Options, HSTS

## Performance
- next/image with responsive sizes
- Font: self-host, display swap
- Code splitting: 3D component dynamic import no SSR

## Decisions must be logged in DECISION_LOG.md
