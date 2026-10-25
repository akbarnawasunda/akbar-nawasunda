# Round 17 — the five-role type map

The owner asked for a new font mapping for `next/font/local`:

| role | family | what it is for |
| --- | --- | --- |
| `--font-display` | Excess-V-Straight | H1 and the giant hero name |
| `--font-heading` | Psychlone-Straight | H2, section titles (`MUSIK`, `ARSIP`, `PRESS KIT`) |
| `--font-body` | Relidux | body copy, paragraphs, buttons, and every small label with wider tracking |
| `--font-label` | Impact-Label-SWL | release and track titles, play links, anything that should read as a stamp or a cassette label |
| `--font-accent` | Marse-loup | quotes and decorative lines |

Plus one instruction that is easy to miss and shapes the small type: navigation and meta (`01 —
Katalog`) must be set in **Relidux with wider letter-spacing**, not in a mono face.

## Read this first: the five files are not in the repository

`src/assets/fonts/` still contains the round 16 set (Space Grotesk, Inter, JetBrains Mono, Anton,
Instrument Sans/Serif). None of Excess-V-Straight, Psychlone-Straight, Relidux, Impact-Label-SWL or
Marse-loup is present, and there is no trace of them elsewhere in the workspace or in the files the
owner uploaded. Rather than block the whole job on that, the five slots are wired and running with
the closest available face in each:

| slot | running today | target |
| --- | --- | --- |
| display | Space Grotesk 700 | Excess-V-Straight |
| heading | Instrument Sans 400–700 | Psychlone-Straight |
| body | Inter 100–900 | Relidux |
| label | Anton 400 | Impact-Label-SWL |
| accent | Instrument Serif 400 + italic | Marse-loup |

The stand-ins are deliberately *different faces per slot*. An earlier pass had display and heading on
the same file; that makes the role map invisible in a screenshot, and the map is the deliverable.

**To finish:** drop the five licensed files into `src/assets/fonts/`, edit the five `src:` values in
`src/lib/fonts.ts`, delete the stand-ins. No component changes: nothing in `src` names a family, only
a role.

## What changed in the code

- **`src/lib/fonts.ts`** — five `localFont` calls (`displayFont`, `headingFont`, `bodyFont`,
  `labelFont`, `accentFont`), each exporting a `--font-*` variable. `monoFont` is gone; the mono role
  no longer exists.
- **`src/app/layout.tsx`** — the five variables are applied to `<html>`.
- **`src/styles/tokens.css`** — five stacks (`--font-display-stack` … `--font-accent-stack`), plus
  `--tracking-nav` (0.13em) and `--tracking-stamp` (0.015em) and `--leading-stamp` (0.94).
- **`globals.css`** — `h1` takes the display stack, `h2`/`h3` take the heading stack. The old module-
  wide `--font-mono-stack` (97 declarations across 23 stylesheets) became `--font-body-stack`, so
  every navigation label, counter, eyebrow and footer rule is now body type at `--tracking-nav` or
  `--tracking-label`.
- **`PageMasthead`, `contact`, `epk`, `artist`, `not-found`** — page names are section-level type and
  moved to the heading stack. No page H1 is the site's own name, so none of them is display type.
- **Release titles** — `ReleaseTicker`, `CatalogueIndex`, `CatalogueWall`, `ReleaseCover` (generated
  sleeve), `ReleasePlate` (`.title`, `.linkLabel`, `.neighbourTitle`), the homepage featured title
  (`.transmissionTitle`), the drawer's latest release, and `BackSide`'s release row. All now
  `--font-label-stack`, `font-weight: 400`, `--tracking-stamp`, uppercase.
- **Quotes** — the homepage night-frame quote moved to the accent stack.
- **Buttons and nav** — `.base` in `ButtonLink`, the header wordmark/listen/MENU/drawer index all use
  the body stack with `--tracking-nav`.

## Gates

```
typecheck ✓   lint ✓   audit:tokens 89 ✓   test 131/131 ✓   build ✓
a11y 0 violations / 16 loads ✓   qa:motion 22/22 ✓   smoke 28/28 ✓
check:web 196 KB gz JS (budget 250) · 17 KB gz CSS (budget 40)
```

## Screenshots and proof

`home-desktop.webp`, `home-mobile.webp`, `music-desktop.webp`, `music-mobile.webp` — production build,
1440×900 and 390×844, full page, curtain skipped, scroll walk first.

`type-specimen.png` — one line per role, rendered **through the live token stacks** (`var(--font-*-stack)`
read off `:root` in the running build), with the family each text node actually resolves to shown next
to it. This is the sheet to look at when asking "did the mapping apply".

`npm run audit:fonts` — the same question answered without a browser: reads the role map out of
`src/lib/fonts.ts`, checks each binary exists and is real WOFF2, and prints whether the slot is on the
target family or on a stand-in. Today it reports **0/5 on target, 5/5 wired and rendering**.

Known capture artefacts (not layout bugs): the sticky header appears twice in a full-page mobile
capture, and the 3D monogram band can render before its first frame under software Chromium.
