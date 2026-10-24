# TYPOGRAPHY

Three families, all self-hosted through `next/font/local` (`src/lib/fonts.ts`, files in
`src/assets/fonts/`, licences beside them). Nothing is fetched from a third-party host at runtime.

| Role | Family | Weight | Where |
| --- | --- | --- | --- |
| Display | **Instrument Serif** (roman + italic) | 400 only | H1, page titles, section heads, featured release title, stat values, wordmark |
| Body | **Instrument Sans** (variable) | 400–700 | Paragraphs, links, list labels, small card titles |
| Mono | **JetBrains Mono** | 400–600 | Eyebrows (`01 — Katalog`), metadata, `[NEEDS OWNER]`, file sizes |

## Why this changed (2026-10-24, D-108)

The previous display face was Syne at 700/800, uppercase, −0.02…−0.045em. Read back to the owner, it
was one of the two things called out as *"jelek"* — alongside the decoration. Three reasons it was
the wrong face for this site:

1. **Syne is a techy grotesque.** It reads "startup landing page", which is the exact register an
   artist site is trying not to sound like.
2. **Uppercase at 800 is loud everywhere.** When every heading is the same slab of capital letters,
   hierarchy has to be carried by size alone, and ten release sleeves all shout identically.
3. **A single weight has nothing to modulate with.** No italic for emphasis, so the only gesture left
   was colour, which is how the blue slab ended up behind the A.

Instrument Serif solves all three: it is a high-contrast text serif with a real italic, it reads as
printed music writing (a Pitchfork review, an RA feature, a record sleeve), and its 400 weight lets
the page whisper where Syne shouted.

## Rules

- **Sentence case for headings.** `Nawasunda`, not `NAWASUNDA`. Only mono labels are uppercase.
- **Italic is the one emphasis device.** The hero puts the surname in italic against a roman given
  name; the monogram band does the same with `AN`. Do not stack italic + colour + tracking; one.
- **One weight.** Instrument Serif ships in 400. `font-synthesis: none` is set on `body`, so a stray
  `font-weight: 700` falls back to 400 instead of a synthesised bold.
- **Line height by role.** Hero `0.9` (no descenders in the two hero words); display headings `0.95`;
  section heads `1.02` (`--leading-tight`). A serif set at a grotesque's 0.85 collides.
- **Tracking.** `−0.015em` on display sizes, `−0.01em` on the rest, `0` below ~1.5 rem. Serifs carry
  their own sidebearings; the old −0.045em crushed the counters.
- **Optical alignment.** The hero H1 has `margin-left: -0.02em` so the `A`'s left sidebearing lines up
  with the flush-left eyebrow above it.
- **Fluid sizing, measured.** `clamp()` everywhere, but the floors are checked against real strings at
  320 px (Instrument Serif is narrow — `Nawasunda` measures ≈ 4.6 em, so the hero can be larger than
  the old Syne ceiling and still clear the portrait column).
- **Hierarchy must be visible without colour.** Size and weight-of-presence carry it; colour is an
  accent, never the signal.
- **Contrast.** Text primary on bg.base 15.8:1, secondary 7:1. The blue accent is used as a dot, an
  underline or a filled chip with near-black text (5.56:1, D-071).

## Generated type assets must match

Two places rasterise type outside the browser. Both were re-rendered when the face changed:

- **Release sleeves** — `scripts/generate-placeholder-covers.mjs`, drawn as SVG and rasterised by
  `sharp`. Instrument Serif 400, sentence case, advance widths read from the font's `hmtx` (a serif
  `m` is 0.70 em, an `i` is 0.22 em — a flat estimate wraps titles in the wrong place). Requires
  `InstrumentSerif-Regular.ttf` in `~/.fonts`; without it the rasteriser silently falls back to a
  system sans.
- **Social cards** — `src/app/og/route.tsx`, `public/fonts/instrument-serif-og.ttf` (+ italic).
  The card and the site must never disagree about the display face.

## Related

- `docs/02-DESIGN-SYSTEM/COLOR_SYSTEM.md` — the palette the type sits on.
- `docs/08-IMPLEMENTATION/DECISION_LOG.md` — D-087 (measured headline sizes), D-108 (this change).
