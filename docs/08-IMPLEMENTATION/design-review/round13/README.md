# Round 13 — "SALAH CETAK"

Art-direction overhaul. The data architecture is untouched: no content model, no route, no
component contract changed. What changed is the ink, the type, the grid and the texture.

Files: `01-beranda-{1440,390}.webp`, `03-musik-{1440,390}.webp`, `05-kontak-{1440,390}.webp`,
`07-monogram-1440.webp`
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

## The monogram, printed instead of rendered

The mark was the last metal object on the site: a PMREM room environment, metalness 0.92, roughness
0.16, two lights and ACES tone mapping — an iron badge glued to a page that had just become a sheet
of printed stock. It is now flat ink with no shading model at all:

- `MeshBasicMaterial` on the caps (press cyan) and on the extruded walls (the same ink at 0.55), the
  two groups `ExtrudeGeometry` already provides — so the form still reads as a solid, in two tones.
- Every silhouette edge drawn in stock colour, and the same edges stamped again a hair to the right
  in poster red: the two-plate misregistration `.ink` prints the headings with.
- No environment map, no lights, no PMREM pass, no `computeVertexNormals`, `NoToneMapping` so the
  ink is the exact value the palette specifies.

**Cost, measured** (CDP frame counters patched over `drawElements`/`drawArrays`, 1440×900 @ DPR 2):

| State | Draw calls / 2 s | rAF callbacks / 2 s |
| --- | --- | --- |
| Band far below the fold | 0 | 0 |
| Band on screen | 480 | 120 |
| Scrolled back to the top | **0** | **0** |

The off-screen loop is *cancelled*, not throttled: `pause()` clears the pending frame, so a canvas
nobody is looking at costs no frames at all. `devicePixelRatio` is capped at 1 — the canvas backing
store measured 1440 × 772 at DPR 2, i.e. one device pixel per CSS pixel.

## One piece of furniture moved

The "balik lembar" edge tab was a `--color-paper` slab with ink type: 29 × 119 px of cream hanging in
the middle of the right edge, over whatever the reader was looking at. It is ink now, with a hairline
and stock-coloured type — part of the sheet instead of a label glued to the screen. The affordance
stays (it is the only way to the back of the sheet on a phone, and it is under test).

## What did not change

Routes, content, `Plate3D`/`Depth`/`Tilt3D` composition, `--depth-sheet`, the scroll engine, the
`/privacy` page, and every gate threshold. Weight after the round: JS **191.5 KB gz** (budget 250),
CSS **18.9 KB gz** (budget 40).

## Gates

`audit:tokens` 87 ✓ · `typecheck` ✓ · `lint` ✓ · `test` 131/131 ✓ · `a11y` 0/16 ✓ ·
`qa:motion` 22/22 ✓ · `smoke` 28/28 ✓ · `check:web` 191.3 KB JS / 18.9 KB CSS ✓ · `assets:check` ✓

One harness bug was found and fixed rather than worked around: the a11y sweep scrolled with
`window.scrollTo` faster than Lenis could settle, so a scroll-revealed block was still at opacity 0
when axe measured it, and axe reported the text as blended into its own background (1:1). The audit
now walks every armed reveal into view and waits for its computed opacity to reach 1.
