# Round 15 — Premium High-Tech / Futuristic Cyberpunk

The owner's brief, verbatim in substance:

> The Zine/Brutalist concept has destroyed the layout, made the type look cheap, made the text hard to
> read, and made the photographs boring because they repeat. Throw the zine out. Change the UI/UX
> completely into Premium High-Tech / Futuristic Cyberpunk. It has to be tidy, elegant, have a lot of
> whitespace, and sit with the neon-blue 3D monogram that already exists.

Five instructions came with it: Space Grotesk / Inter / JetBrains Mono; a clean symmetric grid with
generous whitespace and hairline neon rules; short copy; a CSS treatment on **every** photograph; and
one palette — `#050507`, white, `#0087FF`.

This folder is the evidence. No pull request was opened for this round, by instruction.

## What was actually removed

The zine was not a colour scheme, it was a set of *print devices*. Each one is gone, and each one had
to be replaced rather than deleted, because most of them were carrying a function:

| Removed | Where it was | Replaced by |
| --- | --- | --- |
| Anton (display) | `src/lib/fonts.ts` | Space Grotesk variable, 300–700 |
| Instrument Sans / Instrument Serif | `src/lib/fonts.ts` | Inter variable, 100–900 |
| Red/cyan misregistration plates | `globals.css` `.ink`, `InkPress` | a neon bloom driven by the same pointer variables (`--ink-x` / `--ink-y`) |
| Rotated, overlapping, off-grid type | hero, page heads, release plate, contact | one left-aligned measure, no rotation, no overlap |
| Full-bleed `#0087FF` fields | page heads, ticker, release band, load curtain, footer bar | dark grounds, hairline seams, accent as type and as a 2 px closing rule |
| Paper panels, halftone trims, barcodes, registration marks, side strips, stamps | masthead, contact, epk, footer, hero | hairline panels, mono labels, one lit rule per section |
| Untreated photographs | archive rail, archive wall, press photo, night band | duotone + scanline on every image, with per-page crop ratios |

`src/components/print/Registration.tsx` and its stylesheet were deleted: it drew a printer's crop
mark on four routes, and there is no honest way to keep a crop mark in a design that is no longer
about printing.

## The five instructions, concretely

**1. Typography.** `next/font/local` now loads Space Grotesk (display), Inter (body) and JetBrains Mono
(labels). The woff2 files live in `src/assets/fonts/` with their licences, so the build does not depend
on a package that was installed with `--no-save`. Nothing is italic; the accent on the second line of
the name is weight and colour, not slant.

**2. Layout and grid.** One measure (`--container-max: 1240px`) and one gutter, on every route. The
hero is a single column of masthead → name → paragraph → actions → facts, separated by hairlines and
`--space-12` of air. Sections are `padding-block: var(--section-padding)` with a 1 px `--color-border`
seam; the seam under the hero is the only fully lit rule on the page (`--color-hairline-strong`).

**3. Copy.** Hero, transmission, monogram, press and EPK paragraphs were cut to one or two lines. The
owner's own biography (`artistLongBio`, verbatim from their profile file) was **not** cut — it is
their text, not filler.

**4. Photographs.** Two rules do all of it:

```css
.site-main img {
  filter: grayscale(1) contrast(1.08) brightness(0.9) sepia(0.34) hue-rotate(178deg) saturate(2.7);
}
```

…plus a per-component screen (`repeating-linear-gradient`, 3 px raster, 4 % white) on a pseudo-element,
because `mix-blend-mode` and `filter: blur(` are banned by `tests/fixtures/anti-ai.ts`. Crops differ by
page: the hero is a cinematic 62 % 46 % frame, the night band is 50 % 32 %, the press portrait is a 4:5
crop anchored at 50 % 18 %, the archive wall is square with the anchor alternating 50/58/40 % per
column, and the rail keeps 4:5 with its own frame. The same six files now read as six different shots
per route.

**5. Colour.** `#050507` ground, white ink, `#0087FF` accent. The accent never fills a surface bigger
than a control. `--color-text-muted` was lifted from `#6D7688` to `#8A93A6` because 9 px mono at 4.46:1
fails AA — visible in this round's audit run, fixed rather than noted.

## Files

- `src/styles/tokens.css` — rewritten ("NEON GRID"): ground, ink, accent, hairlines, interface metrics,
  type scale, spacing, radii ≤ 4 px.
- `src/styles/globals.css` — dark `.paper`, 1.5 % grain, neon bloom `.ink`, blue focus ring, the
  site-wide photographic treatment.
- `src/lib/fonts.ts` + `src/assets/fonts/*` — the three families.
- `src/app/(site)/page.module.css` (rewritten) and `page.tsx` — the homepage.
- `src/app/(site)/visuals/{page,visuals.module.css}` — the archive route.
- `src/components/media/{VisualGrid,VisualRail}.{tsx,module.css}` — the wall and the rail, with the
  treatment and the varied crops.
- `src/components/layout/PageMasthead.*`, `SectionHeader.module.css`, `SiteFooter.module.css`.
- `src/components/ui/ButtonLink.module.css` — accent primary, hairline secondary.
- `src/components/content/{CatalogueIndex,ReleaseTicker,ReleasePlate}.module.css`.
- `src/app/(site)/{contact,epk,artist}/*.module.css`, `src/components/zine/LoadingCurtain.module.css`,
  `src/components/print/BackSide.module.css`.
- `scripts/review/shots.mjs` — new `R15_SHOTS` set and a `puppeteer-core` fallback driver, so this
  review can be re-run on a machine where Playwright's browser download is blocked.

## Gates (at the time of this round)

```
audit:tokens   88 tokens · no raw hex · no orphans
typecheck      pass
lint           pass
test           131/131
a11y           0 violations · 16 page loads
qa:motion      22/22
smoke          28/28
check:web      193.6 KB JS gz / 17.8 KB CSS gz  (budgets 250 / 40)
review:shots   14 states (see below)
```

## The shots

The driver writes PNGs; they are converted to WebP (quality 82) before committing, which takes the
folder from 15 MB to 590 KB — the whole point of committing a review is that it can be read later
without bloating the clone.

| File | What it is meant to prove |
| --- | --- |
| `01-home-hero-1440.webp` | the hero is one column, one photograph, one accent |
| `02-home-ticker-1440.webp` | the running head is a readout, not a slab of blue |
| `03-home-release-1440.webp` | the featured release, sleeve as the only lit object |
| `04-home-index-1440.webp` | ten rows, hairlines, no cards |
| `05-home-archive-1440.webp` | the archive rail: aligned frames, caption rows |
| `06-home-night-1440.webp` | the full-bleed night frame, duotoned, one quote |
| `07-home-monogram-1440.webp` | the 3D monogram in a quiet band (scene itself unchanged since R14) |
| `08-home-press-1440.webp` | press sheet as a hairline panel, portrait at 4:5 |
| `09-home-epk-1440.webp` | the closing action band |
| `10-visuals-1440.webp` | the archive wall: symmetric squares, per-column crops |
| `11-visuals-wall-390.webp` | the wall on a phone |
| `12-home-hero-390.webp` | the hero on a phone, no canvas |
| `13-music-1440.webp` | the catalogue |
| `14-artist-1440.webp` | the artist head and portrait frame |

## Deliberately unchanged

- `AnMonogram.tsx` — the chrome/neon scene, its tuning (DPR 1.5, 30 fps, paused off-screen, no scene
  under 768 px) and its bloom are exactly as shipped in `1568cde`. Only the band around it was
  restyled, plus a left-edge wash so the copy never sits on the object's brightest edge.
- `Plate3D` / `Depth` / the scroll engine — no new 3D components, no new rAF loops.
- Every photograph is still the owner's own file, every release still comes from their catalogue, and
  every unverified fact is still `[NEEDS OWNER]`.

## Still blocked on the owner

`covers:fetch` (seven real artworks), poster assets, `/visuals` video, `/privacy` copy, 2021–2023
milestones, and the release title `Hitungan Cinta Breakbeat Super Exc` (truncated in the source data).
