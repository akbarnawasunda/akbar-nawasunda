# Round 25 — liquid monogram, smaller type, pressed objects

Owner's note, verbatim in spirit: the bone/ink palette is approved and stays; everything else about
the media is "kurang spesial dan khas". The monogram band's copy ("Tanda AN", its label, its meta)
must disappear — a mark that introduces itself in words is a mark that does not trust itself. The
mark itself must behave like water: touch it and it parts, a little. And the whole page's type scale
was too big.

## 1 — The copy is gone

`page.tsx` no longer renders the signature band's `sectionNumber`, `h2` or meta paragraph; the
section carries `aria-label="Monogram"` instead of a labelled heading, and the four now-orphaned
classes (`.signatureInner`, `.signatureTitle`, `.signatureAccent`, `.signatureMeta`) left the
stylesheet with it. The band is now only the object and the HUD crosses in its corners.

## 2 — Liquid, without a renderer

`AnMonogram.tsx` keeps the round-20 bake (two WebP stills, no WebGL, no canvas, no second rAF) and
gives it water:

- **The part.** Two extra copies of the same still sit exactly on top of it. While the pointer is
  inside the band they translate apart along the pointer vector — `--space-2`, a few pixels, never
  more — at 38% of the strength the pointer writes; the base answers with a smaller counter-lean.
  Leave, and all three heal back into one surface through a 260 ms transition. `d-home-monogram`
  (at rest) vs `d-home-monogram-liquid` (pointer inside) is the pair that shows it.
- **The wobble.** One inline SVG filter, `feTurbulence → feDisplacementMap`, bends the stack like a
  reflection in disturbed water. Displacement scale is written from the pointer's own speed (event
  timestamps, no clock of our own) and the filter only attaches while `data-liquid` is set — an
  untouched band pays zero filter cost. `filter: url()` is not the banned `filter: blur(`.
- **No new loop.** Everything is written inside `pointermove`/`pointerdown` handlers and smoothed by
  CSS; the band's rect is read once per scroll burst, never per move — the layout-thrash lesson
  still stands. Reduced motion gets the still, unsplit, unrevealed-then-shown as before.

## 3 — Sleeves are pressed objects, not rectangles

Series v4 in `generate-placeholder-covers.mjs`: every sleeve is die-cut — one 45° corner off the
top-right, and the cut is real alpha, so the sleeve lies on its ink plinth like a cut object
(`d-home-rail`, `d-music-featured`). The object gains the anatomy of a jacket: ink spine down the
left edge, the label's monogram as a stronger ghost bleeding off the bottom-right, the teal
misregistration rule grown to 10 units, a crop hairline that follows the die. Round 19's ban on
sleeve typography stands; the card beside the sleeve still sets the title in Relidux.

`ReleaseCover.module.css` also drops the site-wide grayscale from sleeves: a sleeve is printed
artwork with one allowed hue, not a photograph shot under a strange lamp — the global rule was
eating the teal rule and the wall read grey-on-grey.

## 4 — Registration, and a smaller voice

The night frame on `/` and the stage band on `/artist` now carry two printer's crosses at their top
corners — the marks a sheet carries so the press knows where the image was meant to sit. Same
crosses the HUD used, resized to the page (`d-home-night`, `d-artist-stage`).

Type: the four display tokens in `tokens.css` lost roughly a quarter of their scale (hero
`10.2vw/10.5rem` → `7.6vw/7.5rem`, takeover → `5.8vw/5.2rem`, display → `4.4vw/3.4rem`, title →
`1.8vw/1.6rem`), the footer wordmark `10.2vw` → `7.6vw`, and every component clamp above ~2 rem
followed by ~20% (contact title, plates, ticker, tape, masthead, curtain, menu, 404). Body and
label sizes are untouched; the page breathes instead of shouting (`d-home-hero`, `m-home-hero`).

## Shots

| file | what it proves |
| --- | --- |
| `d-home-hero.webp` | smaller hero scale, same poster geometry |
| `d-home-monogram.webp` | the band with no copy at all, at rest |
| `d-home-monogram-liquid.webp` | pointer inside: the mark parts and wobbles |
| `d-home-rail.webp` | die-cut sleeves with spine, ghost and teal rule in the rail |
| `d-home-night.webp` | registration crosses pinning the night frame |
| `d-music-featured.webp` | the die-cut lying on its ink plinth |
| `d-artist-stage.webp` | crosses over the empty stage |
| `m-home-hero.webp` | mobile scale after the shrink |
| `m-home-rail.webp` | die-cut survives 390 px |

Gates at this commit: typecheck 0 · lint 0 · tokens 91 · tests 132/132 · a11y 0 violations across 16
loads · qa:motion 22/22 · review:shots 19/19 · check:web JS 190.2 KB gz / CSS 17.6 KB gz.
