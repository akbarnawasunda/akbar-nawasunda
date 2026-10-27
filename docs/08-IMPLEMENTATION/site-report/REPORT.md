# SITE REPORT — Akbar Nawasunda official artist site

**State at commit `4baa91d`, branch `arena/e02160ef-akbar-nawasunda`, dated 2026-10-26.**
Written to be handed to another AI for analysis: every claim below is either a measured number
(from the gate scripts named in §10), a file path you can open, or a screenshot in `./shots/`.
Where something is a placeholder or still missing, it says so — do not assume completeness.

---

## 1. What this site is

Official site of **Akbar Nawasunda**, a DJ/remixer from Bandung Barat, Indonesia (active since
2020). Luxury-artist-site brief in the Rp 100–300 jt class: image-led, monochrome, type-driven,
with a CMS ("NAWA STUDIO") the owner uses to publish releases and pages without a developer.
Public copy is Indonesian; studio UI is Indonesian by owner decision.

## 2. Stack

| layer | choice | note |
|---|---|---|
| framework | Next.js **16.4.0** App Router, React 19.3 | Turbopack build |
| styling | **CSS Modules + design tokens only** | no Tailwind, no PostCSS utilities, no CSS-in-JS (repo contract) |
| data | **Turso (libsql) + hand-written SQL DDL** | `src/studio/schema.ts`; no ORM runtime beyond @libsql/client |
| admin writes | **server actions** (`src/studio/actions.ts`) behind session auth | no REST API surface on the site today |
| deploy target | Vercel ("GITHUB → MAIN → VERCEL" is the owner's production flow) | build is environment-agnostic |
| 3D/WebGL | **none** — retired round 20 | see §6 |
| animation | one shared rAF scroll engine (`src/components/zine/scroll-engine.ts`) | contract: no second loop may be added |

## 3. Route map

Public (`src/app/(site)/`): `/` (home), `/music` (catalogue wall), `/music/[slug]` (release
detail, 10 seeded releases), `/artist`, `/visuals`, `/epk`, `/contact`, 404, `/robots.ts`,
`/sitemap.ts`, `/manifest.ts`, OG image route `/og`.
Studio (`src/app/studio/`, Indonesian UI, login-gated): dashboard, `login`, `music` list/edit/new,
`pages` list/edit, `media`, `design`, `preview/[slug]` + `preview/release/[slug]`.

Content model: one generic table `studio_pages(slug, draft_json, draft_updated_at,
published_json, published_at)` — **public code reads only the published snapshot**; plus
`studio_sessions(token_hash, created_at, expires_at)` and `studio_login_failures` (single-row
rate-limit counter). Drafts never leak to public routes; that is asserted by tests.

## 4. Visual doctrine (rounds 16–19, still binding)

- **Pure `#000000` / `#FFFFFF` page chrome.** No teal, no duotone, no glass. The only colour allowed
  anywhere is the monogram's neon `#0087FF` and the blue tip of the brand mark.
- HUD furniture: `+` / `×` corner crosses, 11px mono section labels (`01 — KATALOG`), hairlines,
  giant uppercase display type at 10–15vw, zero marketing fluff copy.
- **Two-typeface contract (round 19):** `--font-display` = Excess V Straight 400, used for the hero
  `h1` name *only*; `--font-body` = Relidux 400 for everything else (H2/H3, titles, paragraphs,
  buttons, nav, footer). Three retired commercial faces remain in the repo (owner purchased them)
  but are never loaded; `npm run audit:fonts` exits non-zero if any file references them.
  All weights are 400 with `font-synthesis: none`; paragraphs `line-height 1.6` at `#b8b8b8`.
- Photography: one global treatment, `grayscale(1) contrast(1.18) brightness(0.92)` under
  `.site-main img` — deliberately exempted for the monogram still and the brand mark.
- Tokens: 86 custom properties in `src/styles/tokens.css`; `npm run audit:tokens` fails on raw hex
  in CSS modules or orphaned tokens.

## 5. Typography & layout health (round 19)

Song/release titles are plain uppercase Relidux with `--tracking-title: 0.04em`,
`--leading-title: 1.12`, text-wrap balance + break-word. The catalogue wall collapses to one
column ≤560px so titles can never clip mid-word on phones. No horizontal overflow at 320–1920px
(asserted per-width by `qa:motion`).

## 6. The monogram: liquid metal, baked not computed (round 20)

Rounds 14–19 shipped a real-time WebGL object (three.js `MeshPhysicalMaterial` chrome, vertex-shader
liquid displacement, UnrealBloom at threshold 0.72, neon `#0087FF` edge lines). Round 20, on the
owner's instruction ("3D pake liquid aja cuy, jangan 3D berat jir"), **the renderer was deleted and
its output baked once** into two WebP stills by `scripts/bake-monogram.mjs`:
`public/assets/monogram/liquid-metal-wide.webp` (47 KB, ≥1024px composition) and
`liquid-metal-narrow.webp` (35 KB, centred composition for <1024px and phones — phones previously
got *nothing* below 768px). `AnMonogram.tsx` is now a lazy `<picture>` with the old reveal fade and
a drift through the shared scroll engine. Consequences, all asserted by tests: **zero `<canvas>`
elements site-wide, no WebGL context, no `three` in the dependency tree, no second rAF loop.**
Cost went from a 78.7 KB gz lazy chunk + permanent GPU work to two lazy images.

## 7. Motion architecture

One rAF loop and one passive scroll listener for the whole site (`scroll-engine.ts`); subscribers
register via `<Depth>`/`registerDepth`/`registerPin`. Writes only `transform`/`opacity`, batched
read-then-write. `prefers-reduced-motion: reduce` registers nothing — markup renders at rest.
Pointer interactions gate on `event.pointerType`, never on `(hover: none)` media queries (repo
contract). Loading curtain, header hide/show, catalogue tilt and the release ticker all ride this
one engine.

## 8. Media & assets

- Fonts: two licensed commercial faces loaded (subset woff2, single weight each); provenance in
  `src/assets/fonts/LICENSE-COMMERCIAL.txt` (owner purchased, accepts liability; binaries must not
  be copied elsewhere).
- Release artwork: **placeholder sleeves today** — generated type-free sleeves
  (`scripts/generate-placeholder-covers.mjs`, 10 × ~3 KB webp) standing in until the owner supplies
  real cover art. This is the single biggest visual gap and it is intentional, not forgotten.
- Archive photography: six owner files, grayscale-treated (§4).
- Brand mark: `public/brand/an-mark.webp`; its vector contours live in `src/assets/an-shape.ts`
  (traced source of truth, kept after the renderer's retirement).

## 9. Performance, measured

| metric | value | budget |
|---|---|---|
| JS on `/` | **189.6 KB gz** over 11 chunks | < 250 KB |
| CSS | **16.7 KB gz** over 3 files | < 40 KB |
| LCP `/` desktop (documented Lighthouse run) | 0.9 s | < 2.5 s |
| LCP `/` mobile (documented, local HTTP/1.1 sim) | 3.4 s (score 90) | noted, not budgeted |
| canvases / WebGL contexts | **0 / 0** | 0 |
| TBT `/` | 0–10 ms | < 200 ms |
| CLS | 0 desktop / 0.009 mobile | < 0.1 |

Heavy things are lazy by policy: nothing for the monogram band loads before the band is near the
viewport; the studio bundle never touches public routes.

## 10. Quality gates (all green at this commit)

| gate | command | result |
|---|---|---|
| unit + contract tests (132) | `npm test` | 132 pass / 0 fail |
| database tests | `npm run test:db` | pass |
| typecheck | `npm run typecheck` | 0 errors |
| lint | `npm run lint` | 0 errors (2 pre-existing warnings in a generator script) |
| token audit | `npm run audit:tokens` | 86 tokens, no raw hex, no orphans |
| font audit | `npm run audit:fonts` | 2 loaded families, retired faces unreferenced |
| accessibility | `npm run a11y` | **0 violations across 16 page loads** (axe) |
| motion/overflow QA | `npm run qa:motion` | **22/22**, incl. zero-canvas + no overflow 320–1920 |
| weight & links | `npm run check:web` | within budget; 16 routes, 22 internal targets, 48 media files, every anchor resolves |
| visual review | `npm run review:shots` | 19 curated states |

The anti-AI/anti-slop fixture (`tests/studio/anti-ai.test.ts`) bans, in app code: particle/signal
fields, `radial-gradient`/`mix-blend-mode`/`filter: blur(`/glassmorphism as *page decoration*,
`<canvas>`, infinite CSS animations, and any 3D renderer dependency — each with a round number where
the ban was earned.

## 11. Security posture

CSP `default-src 'self'` with inline script/style only where Next requires it, `object-src 'none'`,
`base-uri`/`form-action 'self'`, `frame-ancestors 'self'` (preview sandbox opt-in via env),
plus referrer/permissions policies in `src/lib/security-headers.ts`. Studio sessions are hashed
tokens with expiry; login is rate-limited through `studio_login_failures`; passwords stored hashed
(`scripts/studio-hash-password.ts`).

## 12. Design history, compressed

| round | move |
|---|---|
| 13 | zine/print language |
| 14 | black-chrome 3D monogram, neon edges (owner banner as reference) |
| 15 | liquid-metal vertex displacement + pointer ripple |
| 16 | Swiss/HUD reset: pure black-white, crosses, giant type — superseded 13–15 colours |
| 17 | five-role content map (DJ / remixer / producer …) |
| 18 | owner's purchased commercial faces live |
| 19 | two-typeface cleanup: display face for the hero name only, Relidux everywhere else |
| 20 | renderer deleted, monogram baked to WebP; phones get the object for the first time |

## 13. Known gaps / owner-dependent (read this before judging "finished")

1. **Real cover artwork** — sleeves are placeholders (§8).
2. **Visuals/gallery assets** — the route exists and is styled; its archive is thin.
3. **EPK figures** — route structured; numbers await owner input.
4. **Production parity** — the owner's production repo (`akbar-next`, private) could not be read
   from this environment (403); alignment/migration is planned but blocked on access.
5. Mobile LCP 3.4 s documented on a pessimistic local simulation (§9) — CDN deployment expected to
   improve it; not yet re-measured on Vercel.

## 14. Screenshots (evidence, `./shots/`, captured 2026-10-26 from this build)

Desktop 1440×900: `d-home-hero`, `d-home-band` (baked monogram), `d-home-mid` (quote + platforms +
genre ticker), `d-home-footer`, `d-music-wall`, `d-release`, `d-artist`, `d-visuals`, `d-epk`,
`d-contact`.
Mobile 390×844: `m-home-hero`, `m-home-band`, `m-music-wall`, `m-release`, `m-artist`,
`m-contact`, `m-menu` (drawer open).
All are WebP, 1× scale, curtain skipped via `sessionStorage["an-curtain"]="1"`, fonts awaited before
capture; no retouching.

## 15. Reproduce everything

```bash
npm ci && npm run build && npm run start -- -p 3000
npm test && npm run typecheck && npm run lint
npm run audit:tokens && npm run audit:fonts
CHROME_PATH=<chromium> npm run a11y        # needs a Chromium on PATH
CHROME_PATH=<chromium> npm run qa:motion
npm run check:web && npm run review:shots
```
