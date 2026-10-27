# Round 20 — the liquid metal is baked, not computed

**Owner's instruction, verbatim and repeated until it landed:** "3D pake liquid aja cuy, jangan 3D
berat jir." Read plainly: keep the liquid-metal object, delete the engine that computed it every
frame. Done.

## What changed

- `three` and the post-processing chain are **gone from the dependency tree** (`npm uninstall three
  @types/three`). No WebGL context, no shader compile, no PMREM room, no rAF loop, no canvas element
  anywhere in app code — `tests/studio/anti-ai.test.ts` now bans all of it absolutely, and
  `scripts/qa-motion.mjs` check 7 asserts zero canvases on a live page.
- The monogram's look was captured **once, from the real round-19 renderer**, by
  `scripts/bake-monogram.mjs`: black chrome, neon `#0087FF` edges, bloom at threshold 0.72, the
  perspective-grid stage. Two compositions ship as WebP:
  `public/assets/monogram/liquid-metal-wide.webp` (≥1024 px, mark offset right) and
  `liquid-metal-narrow.webp` (<1024 px, mark centred).
- `AnMonogram.tsx` is now a viewer: a lazy `<picture>`, the same `data-ready` reveal fade the canvas
  had, and the site's **one** scroll engine (`<Depth>`) for the drift — no second loop, and under
  `prefers-reduced-motion` the mark simply stands still.
- **The phone finally gets the object.** Rounds 14–19 mounted nothing below 768 px — a large part of
  why the site read as empty, and "jelek", on one. The narrow bake is centred composition, exactly
  what the old scene showed tablets.
- One global rule had to be exempted: `globals.css` grayscales every photograph under
  `.site-main img`, which turned liquid metal into tin. `.canvas .still { filter: none }` restores
  the neon, same trick the page module already used for the old fallback mark.

## What it weighs

| | before (round 19) | after (round 20) |
|---|---|---|
| `three` + postprocessing, lazy chunk | 78.7 KB gz, downloaded the moment the band appeared | **0** |
| WebGL context + shader compile + PMREM | on the main thread, after the band appeared | **gone** |
| rAF loop while the band is on screen | 30 fps at rest, 60 fps while touched | **gone** |
| the object on a phone | **nothing** — empty band | 35 KB WebP, lazy |
| the object on desktop | the chunk above + GPU forever after | 47 KB WebP, lazy |
| route `/` JS total | 189.6→196 KB gz across builds | **189.6 KB gz** (budget 250) |

## Evidence in this folder

- `home-band-desktop.webp`, `home-band-mobile.webp` — the band, both viewports, neon intact;
- `home-hero-desktop.webp`, `home-hero-mobile.webp` — the first screen, unchanged;
- `artist-band-desktop.webp` — the second route that carries the mark.

Gates at commit: typecheck 0 · lint 0 errors · audit:tokens 86 · audit:fonts 2 families ·
tests 132/132 · a11y 0 violations / 16 loads · qa:motion 22/22 · check:web 189.6 KB gz JS /
16.6 KB gz CSS, all links resolve.
