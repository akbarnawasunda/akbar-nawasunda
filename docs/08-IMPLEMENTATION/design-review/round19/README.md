# Round 19 — two faces, strict hierarchy, room to breathe

The owner's verdict on rounds 17–18: **ransom note effect**. Five families fighting in one viewport,
song titles wearing white tape boxes, type everywhere shouting. The correction:

1. `--font-display` (Excess-V-Straight) — the hero H1 "AKBAR NAWASUNDA" **only**.
2. `--font-body` (Relidux) — **everything else**: H2/H3, page names, release and track titles,
   paragraphs, buttons, navigation, meta labels.
3. Psychlone, Marseloup and Impact-Label: **gone from the UI**. No tape boxes on song titles; titles
   are plain Relidux text with a little letter-spacing.

Plus the UX polish: airier spacing, paragraphs at `line-height: 1.6` in grey instead of glaring
white, and nothing overlapping or clipped on phones.

## What changed

- **`src/lib/fonts.ts`** — two loaders, down from five. The three retired binaries stay purchased and
  subset in `src/assets/fonts/` but nothing loads them.
- **`src/app/layout.tsx`** — two variables on `<html>`.
- **`src/styles/tokens.css`** — two stack tokens; `--tracking-stamp`/`--leading-stamp` (the label
  face's metrics) replaced by `--tracking-title: 0.04em` / `--leading-title: 1.12` for release titles.
- **`src/styles/globals.css`** — `h1` = display face; `h2,h3` = Relidux; a global `p` rule sets
  `--leading-body` (1.6) and `--color-text-secondary` (#b8b8b8 — 10:1 on black, WCAG AAA, no glare).
- **16 stylesheets** swept block-by-block: every heading/label/accent consumer moved to the body
  stack with the title treatment (uppercase, `--tracking-title`, `--leading-title`). All weights are
  400 — both binaries are single-weight and `font-synthesis: none` forbids a fake bold.
- **The tape boxes died with the face that drew them**: the white slab around ticker titles, index
  stamps and the featured title was inside Impact Label SWL's glyphs, not a CSS background. Removing
  the face removed the box; nothing else was needed.
- **Placeholder sleeves carry no type now** (`scripts/generate-placeholder-covers.mjs`, regenerated
  with `--force`): ground, ghost monogram, misregistration rule. A rasterised Anton title inside
  cover art was the last ransom-note surface, and raster type cannot reflow, be selected or be
  translated. Every release title on the site is HTML text in Relidux.
- **Display face, read literally**: the footer wordmark and the loading curtain now set the name in
  Relidux giant instead of Excess — the display face appears in exactly one rule (`h1` in globals),
  and only the home hero is an `h1` without a module override.
- **Phones**: the catalogue wall is one column below 560px. Two columns of Relidux caps leave a
  ~130px title column at 390px; "MENCINTAINYA" needs ~180px at the smallest legible size, and the
  only alternatives were unreadable type or words broken mid-syllable. Wall titles keep
  `overflow-wrap: break-word` as a last resort. Wall gaps and masthead margins grew one step.

## Gates

```
typecheck ✓   lint ✓   audit:tokens 86 ✓   audit:fonts 2 roles + retired-face guard ✓
test 131/131 ✓   build ✓
a11y 0 violations / 16 loads ✓   qa:motion 22/22 ✓
check:web 196 KB gz JS (budget 250) · 16.6 KB gz CSS (budget 40)
overflow sweep: 6 routes × 5 widths (320–1440) — no horizontal overflow anywhere
```

## Screenshots

Per route: `*-hero.webp` is the first viewport exactly as a visitor sees it; `*.webp` is the full
page after a scroll walk. `home-footer.webp` shows the wordmark set in the reading face.

Known capture artefacts (not layout bugs): the sticky header appears twice in full-page mobile
captures, and full-page stitches can repeat a band under the site's scroll engine — judge the hero
shots for above-the-fold work.
