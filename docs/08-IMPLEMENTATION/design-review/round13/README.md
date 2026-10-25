# Round 13 — "SALAH CETAK"

Art-direction overhaul. The data architecture is untouched: no content model, no route, no
component contract changed. What changed is the ink, the type, the grid and the texture.

Files: `01-beranda-{1440,390}.webp`, `03-musik-{1440,390}.webp`, `05-kontak-{1440,390}.webp`
(captured after the final build, `sessionStorage an-curtain=1`, `document.fonts.ready` + 1.5 s).

## The verdict this round answered

The R12 build was competent and anonymous: a clean screen blue, a tasteful serif, a polite grid.
Read next to the reference (Travis Scott / Drake-scale artist site), it read as a *well-made label
site*, not as an object with a character. Round 13 asked for a zine: dirtier ink, no serif, broken
grid, thick cut-out rules, visible misregistration, and the empty half of the contact page filled
with the marks a print shop actually puts there.

## What changed

- **Ink.** `#0087FF` (screen blue) → press cyan `#2E8C86` (hover `#3BA39C`), plus a navy field
  `#14263A` with paper `#E8E6E1` on it, poster red `#D94A2F` and a misregistration cyan `#2C7F90`.
  The ground stays `#0A0A0E`. Nothing on the site is `#0087FF` any more — not the OG card, not the
  3D rim light, not the studio swatches.
- **Type.** Instrument Serif is out of the display role; Anton (OFL, one weight, 18 KB) is in, set
  uppercase. `--leading-hero 0.86`, `--leading-tight 0.9`, `--tracking-hero −0.005em`,
  `--text-hero clamp(3rem, 10.6vw, 9rem)`. This applies to the site, the ten generated sleeves and
  the OG cards — three places rasterise the display face and all three were re-rendered.
- **Misregistration.** `.ink` prints every display word twice: a poster-red plate at `2px/1px` and a
  cyan plate at `−2px/−1px` at rest, both multiplied by `--ink-shift` (5 px page, 6 px mastheads)
  under the pointer. The sheet is off-register *before* anyone touches it.
- **Grid, broken on purpose.** The hero name is rotated −1.4°, its two lines overlap, and it hangs
  into the left margin; kickers are bordered stickers at −1.8° and +1.2°; page titles are 4 px-ruled
  bands with a halftone trim; the facts row is a ruled strip with a barcode.
- **Texture.** Grain 0.02 → 0.065 on a 120 px tile (0.035 / 160 px under 720 px). Halftone bands are
  hard-stop `repeating-linear-gradient` stripes — no blur, no blend mode, no radial gradient, per
  `tests/fixtures/anti-ai.ts`.
- **Contact.** The ruled band, the barcode and the vertical running head now own the right column.
  Measured twice, because furniture must never set the size of the sheet: laid out in flow it was
  321 px of type that turned a 552 px head into an 881 px one; it is absolutely positioned now and
  the head is 555 px.
- **Mobile loses the scene.** `AnMonogram` does not mount below 768 px, so a phone never allocates a
  WebGL context, and it is never imported for a band that is off-screen. The hero photograph is
  cropped to `74% 34%` on a phone so the lamp — the only light source in the frame — stays in view.

## What did not change

Routes, content, `Plate3D`/`Depth`/`Tilt3D` composition, `--depth-sheet`, the scroll engine, the
`/privacy` page, and every gate threshold. Weight after the round: JS **191.5 KB gz** (budget 250),
CSS **18.9 KB gz** (budget 40).

## Gates

`audit:tokens` 87 ✓ · `typecheck` ✓ · `lint` ✓ · `test` 131/131 ✓ · `a11y` 0/16 ✓ ·
`qa:motion` 22/22 ✓ · `smoke` 28/28 ✓ · `check:web` ✓ · `assets:check` ✓

One harness bug was found and fixed rather than worked around: the a11y sweep scrolled with
`window.scrollTo` faster than Lenis could settle, so a scroll-revealed block was still at opacity 0
when axe measured it, and axe reported the text as blended into its own background (1:1). The audit
now walks every armed reveal into view and waits for its computed opacity to reach 1.
