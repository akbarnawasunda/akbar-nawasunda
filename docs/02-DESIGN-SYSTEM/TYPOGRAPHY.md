# TYPOGRAPHY

Three families, all self-hosted through `next/font/local` (`src/lib/fonts.ts`, files in
`src/assets/fonts/`, licences beside them). Nothing is fetched from a third-party host at runtime.

| Role | Family | Weight | Where |
| --- | --- | --- | --- |
| Display | **Anton** | 400 only | H1, page titles, section heads, featured release title, stat values, release sleeves, OG cards |
| Body | **Instrument Sans** (variable) | 400–700 | Paragraphs, links, list labels, small card titles |
| Mono | **JetBrains Mono** | 400–600 | Eyebrows (`01 — Katalog`), metadata, `[NEEDS OWNER]`, file sizes |

## Why this changed again (round 13, "SALAH CETAK")

Instrument Serif is a good face and it was the right answer to Syne — but it was answering the wrong
question. Read back against the reference (a Travis Scott / Drake-scale artist site, Awwwards
register), the serif made the site read as a *tasteful editorial product*: warm, polite, and
indistinguishable from a dozen well-set label sites. A zine is not polite. Round 13 asked for thick,
condensed, aggressive display type, and for the serif to come out of the headings entirely.

Anton (SIL OFL, 18 KB, one weight) does what the serif could not: at 144 px a two-word name becomes
a solid slab of ink that can be rotated, overlapped, stacked off the grid, and printed twice with a
misregistered second plate, and it still reads at 8 px in a mono-crowded corner. It is also the
honest choice for the *printed object* metaphor the site is built on — a poster face, not a text face.

What did not change: the palette of weights (still one), `font-synthesis: none`, the mono for labels,
and the rule that hierarchy must survive without colour.

## Why it changed the first time (2026-10-24, D-108)

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

- **Uppercase for display headings.** `NAWASUNDA`, not `Nawasunda`. Anton's caps are the shout; its
  lowercase is a different, lighter voice and belongs nowhere near a headline. Mono labels stay
  uppercase too, which is why they are differentiated by size and tracking rather than by case.
- **Rotation and overlap are the emphasis device now.** The hero name is rotated −1.4° and its two
  lines overlap by a fraction of the leading; page titles are printed with a second, misregistered
  plate (`.ink`). Do not stack rotation *and* colour *and* a plate on one element.
- **One weight.** Anton ships in 400. `font-synthesis: none` is set on `body`, so a stray
  `font-weight: 700` falls back to 400 instead of a synthesised bold.
- **Line height by role.** Hero `0.86` (`--leading-hero`), display headings `0.9`
  (`--leading-tight`), section heads `1`. Anton's caps have almost no descender, so a sub-1 leading
  is correct here where it would have collided in a serif.
- **Tracking.** `0` on display sizes (`--tracking-hero` −0.005em is the only exception, for optical
  sidebearing), `0` below ~1.5 rem. Anton is drawn tight; anything negative closes the counters.
- **Optical alignment.** The hero's second line is nudged −0.05em so the stacked words lean together
  instead of sitting in a column.
- **Fluid sizing, measured.** `clamp()` everywhere, but the floors are checked against real strings at
  320 px. Anton is condensed — `NAWASUNDA` measures ≈ 5.1 em at 400 — which is why the hero can run
  to 9 rem at 1440 and still clear the portrait column.
- **Hierarchy must be visible without colour.** Size and weight-of-presence carry it; colour is an
  accent, never the signal.
- **Contrast.** Text primary on bg.base 15.8:1, secondary 7:1. Press cyan `#2E8C86` is used as a dot,
  a rule or a filled chip with near-black text; paper on cyan is 2.9:1 and is never used for body
  copy. The poster red `#D94A2F` clears 4.5:1 on ink (the EPK stamp's 9 px label lives there) and
  3.4:1 on paper, where it is only ever display-size.

## Generated type assets must match

Two places rasterise type outside the browser. Both were re-rendered when the face changed:

- **Release sleeves** — `scripts/generate-placeholder-covers.mjs`, drawn as SVG and rasterised by
  `sharp`. Anton 400, uppercase, advance widths read from the font's `hmtx` (an `M` is 0.746 em and
  an `I` is 0.227 em — a flat estimate wraps caps titles in the wrong place). Requires
  `~/.fonts/Anton-Regular.ttf`, i.e. the shipped `src/assets/fonts/anton-latin-400.woff2` unpacked
  (librsvg cannot read WOFF2); without it the rasteriser silently falls back to a system sans.
- **Social cards** — `src/app/og/route.tsx`, `public/fonts/anton-og.ttf`, uppercase, line height 1
  (satori lays caps ink outside a sub-1 line box and the meta line collides). The card and the site
  must never disagree about the display face.

## Related

- `docs/02-DESIGN-SYSTEM/COLOR_SYSTEM.md` — the palette the type sits on.
- `docs/08-IMPLEMENTATION/DECISION_LOG.md` — D-087 (measured headline sizes), D-108 (this change).
