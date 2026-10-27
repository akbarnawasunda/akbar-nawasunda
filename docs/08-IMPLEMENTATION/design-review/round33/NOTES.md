# Round 33 — ROMAK TOTAL

Owner's brief: the site still reads as a stiff AI template; six phases, executed in one round.
No Tailwind, every value from `src/styles/tokens.css`.

## What changed, phase by phase

| Phase | Change | Files |
| --- | --- | --- |
| 1 · Copy | `buildLabel`/`designRound` deleted (footer + every other surface); "Kolofon" (Tinta, Kertas, Huruf, Cetakan, run number) removed with the verso sheet; `[NEEDS OWNER]`-style open lists removed from the public chrome; biography replaced with the owner's new paragraph; 2021–2023 milestone now reads as a documented sound-design period; licensing sentence replaced; 404 copy replaced; nav label "EPK" → "Press Kit", button capitalisation unified. | `src/config/navigation.ts`, `src/content/artist.ts`, `src/components/content/NotFoundView.tsx`, `src/components/layout/SiteFooter.tsx`, page files |
| 2 · Layout | Floating `[ ] INDEKS` tab and its sheet deleted; monogram band is now `position: relative` + `isolation` + `overflow: hidden` with a z-indexed canvas layer, so the shader can no longer paint over the ticker; the cream ghost fallbacks (`signatureFallback`, `transmissionGhost`) are gone; "Sedang Beredar" is `#050507` inside a 1px `#0087FF` frame; every `font-size` in every module is a `clamp()` (display ceiling 4rem). | `AnMonogram.module.css`, `page.module.css`, `SiteFooter`, all `*.module.css` |
| 3 · Liquid | `ExtrudeGeometry`, `MeshPhysicalMaterial`, `Environment`/`Lightformer` removed. One `<PlaneGeometry>` + custom fragment shader: AN mark as `uTexture`, two-octave simplex displacement, pointer ripple, chrome→neon ramp, `alpha` from the texture (discard outside the strokes), canvas cleared to alpha 0, `dpr={[1, 1.5]}` on phones, `frameloop` parked off screen. | `src/components/three/AnMonogramLiquid.tsx` |
| 4 · Mobile | Catalogue reel is a native snap scroller with half-screen runway (`scroll-padding-inline` + `padding-inline`), titles can break inside the card, release title capped at 4rem with hyphens; a failed sleeve URL falls back to a `#14263A` panel with the AN mark instead of a white box. | `CataloguePin.module.css`, `ReleasePlate.module.css`, `ReleaseCover.*` |
| 5 · Motion | Lenis `lerp: 0.08`; `Reveal` is exactly `opacity: 0` + `translateY(30px)` → settled in 600 ms, used on the home takeover, index heading and press sheet; `ImageFade` marks every image `data-img="loaded"` on decode; all of it is inert under `prefers-reduced-motion`. | `SmoothScroll.tsx`, `Reveal.module.css`, `ImageFade.tsx`, `globals.css` |
| 6 · Wow | Glitch-on-hover for navigation links (`attr(data-glitch)` copies, blue/red, clipped bands) in the drawer and the footer; the magnetic cursor from round 31 is unchanged and still desktop-only. | `globals.css`, `SiteHeader.tsx`, `SiteFooter.tsx` |

## Gates run in this environment

```
npm run audit:tokens   ✓ 117 tokens, no raw hex, no orphans
npm run typecheck      ✓
npm run lint           ✓
npm run test           ✓ 132/132
npm run build          ✓ compiled (2 pre-existing Turbopack tracing warnings in src/content/covers.ts)
```

## Screenshots — why they are not in this folder

The sandbox this round was executed in has no browser: no system Chromium/Firefox, and no
`libnspr4`/`libnss3`, so both `puppeteer-core` (with `@sparticuz/chromium`) and `playwright-cli`
cannot launch. Versioned NSS stubs let the binary start, but its DevTools endpoint never answers, so
no screenshot (and no pixel-level overlap audit) could be produced here. The commands that produce
the mobile (390) and desktop (1440) review sheets on a machine that has a Chromium:

```sh
npm run build && npm run start        # one terminal
npm run review:shots -- --round round33 --out docs/08-IMPLEMENTATION/design-review/round33
```

An extra shot worth adding for this round: the ticker directly under the monogram band at 390 px
(the overlap bug), and the home takeover with the new night ground.
