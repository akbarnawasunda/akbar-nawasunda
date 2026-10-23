# ARCHITECTURE

## App Structure (Next.js App Router assumed, audit required)
- app/(public)/page.tsx Home
- app/(public)/music/page.tsx
- app/(public)/music/[slug]/page.tsx
- app/(public)/visuals/page.tsx
- app/(public)/artist/page.tsx
- app/(public)/epk/page.tsx
- app/studio/... protected
- app/api/public/releases/route.ts returns only published
- app/api/studio/... auth required
- components/ui, components/3d/LiquidSignal.tsx dynamic no SSR
- lib/content: releases.json, visuals.json, links.json for v1
- public/uploads (gitignore) + docs/05.../assets official

## Data Flow
- Public SSG: read JSON file server side, ISR 60s
- Studio: client fetch /api/studio with credentials include, mutate JSON or DB
- 3D: client only, useEffect init, cleanup dispose

## Decisions
- Single scene, not multiple — see DECISION_LOG D-001
- JSON local v1 to avoid paid DB — D-003
