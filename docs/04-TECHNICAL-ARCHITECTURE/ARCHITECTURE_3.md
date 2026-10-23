# ARCHITECTURE — v3 Vercel + Turso

```
app/
  (public)/
    page.tsx -> Home, fetches latest releases from Turso published
    music/
    visuals/
    artist/
    epk/
  studio/
    login/page.tsx
    page.tsx (dashboard)
    releases/
  api/
    public/releases/route.ts (GET published only)
    public/visuals/route.ts
    public/links/route.ts
    studio/* (auth)
lib/
  turso.ts -> createClient({url, authToken})
  auth.ts
  content.ts (fetchers)
drizzle/
  schema.ts
  migrations/
public/
  assets/ (transparent logos)
  uploads/ (gitignore, but Vercel Blob preferred)
components/
  ui/ (Nav, Footer, ReleaseCard)
  3d/LiquidSignal.tsx (dynamic no SSR)
```

Data flow: Turso -> Drizzle -> API -> page (ISR)
