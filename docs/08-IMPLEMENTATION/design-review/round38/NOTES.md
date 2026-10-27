# Round 38 — critical art direction

The owner's brief: five fatal visual defects, "the finish of a Martin Garrix / STMPD RCRDS release".
Each item below is recorded as the defect, the cause (as measured, not as guessed), the change, and
the proof.

Screenshots: `public/review-shots/` — `home-1440.png`, `home-390.png`, `home-1440-full.png`,
`release-1440.png`, `music-1440.png`, `discography-1440.png`, `discography-390.png`, `release-390.png`,
`home-390-full.png`. Produced by `.github/workflows/review-shots.yml` (Puppeteer + Chrome, swiftshader
for the WebGL canvas) on the commit that carries this note.

## 1. The mark: foil → mercury

**Defect.** The hero mark read as crumpled aluminium foil: tight, coarse creases, and a highlight that
splintered on them.

**Cause.** Two of them, and the second only became visible while fixing the first.

1. *Frequency.* `liquidHeight()` ran `snoise3` at 2.4 and 6.1 with the second octave at ~0.4 of the
   first's amplitude. Mercury has a very high surface tension; it does not crease, it forms a few
   large, soft, slowly bending lobes. The field is now 0.85 and 1.9 with the second octave at 0.14 —
   an order of magnitude lower, and no comb.
2. *The normal was never a normal.* The central difference was taken over `2e` but **never divided by
   `2e`**, so the "slope" was ~100× too small. Even at a multiplier of 6.0, `normal.z` sat at 0.998
   everywhere: the entire mark faced the camera at one angle, every normal-driven term was a
   constant, and no amount of tuning the specular could produce a gradient because there was no
   gradient to produce. Dividing by the sample spacing (and then scaling by 0.55/0.45) makes the
   ripples actually turn the surface.

**Change.** A lit landscape instead of a grey ramp: `smoothstep` on the horizontal normal gives a
near-white side where the facet leans towards the lamp and ink where it leans away, plus a second
tighter step for the reflected sky's edge. The highlight is two lobes — a broad 12-exponent sheen for
the wet look, a tight 90-exponent glint for the speck — and the rim is a **dilated contour measured
from the texture's own edge** (four alpha taps at a fixed UV radius), mixed 92% towards `#0087FF` so
it stays blue instead of washing out to pale cyan on a near-white base.

Three of those decisions were made from the screenshots, not from the first idea: the sheen-first
version (38) went flat white, the steep-ramp version (38.1) went flat grey, and the additive rim
(38.1–38.3) came out cyan. The shots are the instrument here, not a confirmation step.

## 2. The sleeve series: bone → ink

**Defect.** Thirteen white squares in the discography ledger, which the owner read — correctly — as
thirteen broken images. `/music`'s featured sleeve was a white die-cut square in the same way.

**Cause.** Not `ReleaseCover`'s fallback: the **generated sleeve files themselves** were bone
(`SERIES.ground = #E8E6E1` in `scripts/generate-placeholder-covers.mjs`), rendered in round 24 when
the page still had a paper series. The component was doing exactly what it was told.

**Change.** The generator is re-run with an ink ground (`#0B0B0B`, the `--color-bg-surface-2` step), a
hairline frame (`#1C1D21`), a metallic `#C3CAD3` monogram **centred at 360px** — the old one bled a
760px ghost off the bottom-right corner, which is a signature on paper stock and a smudge on ink — and
the misregistration rule in `#0087FF`, the one chromatic value on the site. Fourteen files were
rewritten into `public/assets/covers/`. At the ledger's 4.5rem the tiles now read as a row of tape
badges on an audio rack.

The navy panel on the homepage (`--color-cover-fallback`, #14263A) keeps its colour, but the ink mark
on it is now printed white (`brightness(0) invert(1)`): an ink silhouette on navy was the same
"empty box" read in a different colour. That one took two attempts — the rule was written as a single
module class at (0,1,0) and silently lost to `globals.css`'s `.site-main img { filter: grayscale(1)
contrast(1.18) brightness(0.92) }` at (0,1,1), so the shot came back byte-identical. A specificity
defeat looks exactly like a change that was never made; the screenshot is what caught it.

## 3. `/music`: no cream anywhere

**Defect.** The catalogue opened black and then hit a full-width `#e8e6e1` band — a different website
in the middle of the site.

**Cause.** `.featured` in `music.module.css` still carried the round-24 poster treatment: bone stock,
a rotated sleeve, and a *token flip* that reassigned `--color-text-primary`, `--color-hairline`,
`--color-border` and friends inside the section so the children would invert with the paper.

**Change.** The band is `--color-night` — the same one-step surface the homepage spotlight uses — with
the site's own tokens inherited, and the sleeve sits on `--color-bg-surface-2` with a
`--color-signal-blue` outline instead of a rotation. The token flip is deleted, not overridden: with
no paper left there is nothing to flip for. `grep -c bone` over the built `/music` CSS is 0.

## 4. The three empty archive tiles

**Defect.** In the visual wall, slots 004–006 (Jalan Malam, Panggung, Maskot) rendered as empty black
frames.

**Cause.** Not missing files: all six exist, and the first three painted only because they were
`loading="eager"`. `scripts/review-shots.mjs` triggered lazy images by walking `window.scrollTo` on a
timer — but **Lenis owns the scroll position** and writes its own animated value every rAF, so each
manual step was overwritten a frame later. The lazy images never entered the viewport, so they were
never requested, and the full-page shot of a page nobody had scrolled showed three holes. This was a
capture defect that looked exactly like a content defect.

**Change.** The harness now asks the browser directly: clear `loading`, re-assign `src` to restart a
deferred request, and `await img.decode()` (with a timeout, and errors resolving rather than hanging —
a genuinely broken file must show up as broken). Both `VisualRail` and `VisualGrid` additionally drop
any item with no `src`, so a *real* gap can never render as an empty frame. Verified in
`home-1440-full.png`: all six tiles paint.

## 5. The desktop hero: one mainstage, not a void

**Defect.** At 1440 the mark sat far right, isolated, with no relationship to the wordmark and nothing
behind it.

**Cause.** The hero grid was `minmax(0, 1.15fr) minmax(0, 0.85fr)`, so the mark's column started at
852px of 1440 and the object itself at ~900px, leaving it in the last tenth of the page. The mark box
also capped at `clamp(11rem, 19vw, 16rem)`.

**Change.** Equal columns (the column now starts at 756px, the mark is optically centred in it), the
mark box is `clamp(13rem, 23vw, 19rem)`, and there is a lamp behind it: one wide, very low-opacity
blue pool (`radial-gradient`, 26% → 0 across 78%) in `AnMonogram.module.css`, under both the baked
still and the shader. It is scoped to the mark's own module on purpose — the page-level rule bans
radial gradients on the homepage modules because a glow behind every card is a style; one lamp behind
one object is a decision.

## Gates

`typecheck`, `lint`, `audit:tokens` (120 tokens, no raw hex in CSS modules), `npm test` 147/147,
`npm run build`, and CI — `check:web`, a11y (0 violations), smoke 28/28, qa:motion 22/22, review shots.

## Commits

`0e9f50c` shader + sleeve series + `/music` + hero · `e001b52` chrome ramp and stroke-edge rim ·
`c53ced6` horizon-lit environment · `de389f7` dilated rim · `5bc7ca4` lazy-image capture fix ·
`3d60bb4` the missing `/2e` · `541613c` reflected-sky edge and tighter glint · `d2462bd` this note and
the white panel mark · `53712f1` the specificity fix that made it apply.
