# Round 8 — "sinyal"

Round 7 was accepted as a step ("ini lumayan"), with four things missing. All four were about the
same gap: the page was well-composed but not *designed by a label*.

| The note | What it meant | What changed |
| --- | --- | --- |
| "3D nya kurang" | Scroll parallax reads as two flat pictures sliding | A real 3D stage (`Plate3D`): pointer rotation, per-layer displacement, and objects with a second printed layer behind them at its own `translateZ` |
| "gak ada warna punya gua" | The brand blue survived at 12 px, i.e. as a hyperlink | The identity colour now fills fields: the catalogue band, the index hover bar, two page heads, the whole contact page, the night photograph, the loader sheet |
| "masih generik, gak ada yang menarik tiap halaman" | Four inner pages opened with the same three grey lines | Every route has one object of its own: /music has the wall, /visuals the blue archive slip, /artist the blue years and the tilted portrait, /contact the 5vw address, /epk the red stamp |
| "animasi loading kurang keren" | The old curtain drew a logo and faded | A title sequence: masked name lines, a real 000 → 100 count, and two sheets leaving — ink then blue |

## Shots

| # | File | Why it exists |
| --- | --- | --- |
| 01 | `01-home-loader-1280.webp` | The sequence at ~69 %: name revealed, counter running, blue rule filling |
| 02 | `02-home-hero-1280.webp` | The hero at rest: photo, 14vw name, blue masthead rule, blue numerals |
| 03 | `03-home-hero-3d-1280.webp` | The same hero with the pointer parked bottom-right — five layers at five distances |
| 04 | `04-home-ticker-1280.webp` | The running head, now a full field of the identity colour with ink type |
| 05 | `05-home-release-1280.webp` | The newest release: sleeve lifted on a plate, blue sheet behind it |
| 06 | `06-home-index-hover-1280.webp` | The paper index inverting to blue under the cursor, sleeve turned on its Y axis |
| 07 | `07-home-night-1280.webp` | The night frame, desaturated and printed in blue |
| 08–09 | `08-music-1280.webp`, `09-music-wall-hover-1280.webp` | The blue sleeve head, and the wall lifting the sleeve under the pointer |
| 10 | `10-visuals-1280.webp` | The archive with its blue slip |
| 11 | `11-artist-1280.webp` | Portrait on a blue plate, years set in display blue |
| 12–13 | `12-contact-1280.webp`, `13-epk-1280.webp` | The address at 5vw on blue; the press kit's red stamp |
| 14–16 | `14-home-390.webp`, `15-music-390.webp`, `16-home-footer-1280.webp` | Phones and the colophon |

## The four notes, answered

1. **Depth.** `Plate3D` is a stage, not a hover effect: `perspective` and `preserve-3d` on the host,
   one lerped rAF writing four custom properties, children free to sit at their own `translateZ`.
   In the hero five layers carry different multipliers of one pointer move — masthead −0,35, name
   0,65, paragraph 0,35, facts 0,18 — and `qa:motion` measures them separating (name +7,0 px against
   masthead −3,9 px) while the stage itself rotates (`rx −0,59°, ry 0,74°`). On /music the wall
   writes a per-card Z with a falloff, so the sleeve under the pointer rises 44 px and its
   neighbours stay flat.
2. **Colour.** The blue is the one already in the owner's AN mark. It is now a *field* colour, which
   only works with ink type on it (5,7:1 — white on this blue is 3,4:1 and is used nowhere). Four
   new tokens: `--color-brand`, `--color-brand-deep`, `--color-on-brand`, `--color-poster-red`. The
   poster red appears exactly once, as a rubber stamp on the press kit.
3. **One object per route.** `/music` — a printed sleeve head plus a wall with a vanishing point;
   `/visuals` — prints laid by hand on a wall, each taking a blue plate on hover, with the archive
   note as a blue slip; `/artist` — the portrait on a blue plate and years in display blue;
   `/contact` — the address at 5vw on a full blue sheet; `/epk` — a document with a red stamp.
   The generic `PageMasthead` is shared by /music and /visuals; the other three are one-offs on
   purpose.
4. **The sequence.** Masked name lines (110 % → 0 at 120/240 ms), a counter driven by rAF from
   000 to 100 over 1 250 ms, a full-width rule filling over the same time, then the ink sheet lifts at
   1 500 ms and the blue one 80 ms behind it. 2,28 s total, once per session, nothing at all under
   reduced motion. The labels never fade in from opacity 0: the first version did, and axe caught
   nine-pixel text at 0 % — a real defect for the first 400 ms, not just a test artefact.

## Measured

- `npm test` — 121/121. `npm run typecheck`, `npm run lint` — clean.
- `npm run a11y` — **0 violations / 14 loads** (390 and 1280 for seven routes).
- `npm run qa:motion` — **18/18**, including four new assertions for this round: the hero stage
  rotates, the hero's layers sit at different depths, the wall lifts the pointed sleeve, the title
  sequence counts and removes itself.
- `npm run check:web` — JS **189 KB gz / 11 chunks** (budget 250), CSS **15,1 KB gz / 3 files**
  (budget 40), 16 routes, 22 internal targets, 47 media files, no dead links.
- `npm run audit:tokens` — 83 tokens, no raw hex in CSS modules, no orphaned tokens.

## Deleted, not hidden

`ReleaseBento`, `ReleaseGrid` and `ReleaseCard` (+ their CSS) were the card system the previous four
rounds kept re-skinning. No route imported them any more, so they are gone, and the anti-ai fixture
now watches the components that actually compose the homepage (`CatalogueIndex`, `ReleaseTicker`,
`Plate3D`). `--color-wave-lime` went with them: a token with no consumer is a colour waiting to be
used badly.
