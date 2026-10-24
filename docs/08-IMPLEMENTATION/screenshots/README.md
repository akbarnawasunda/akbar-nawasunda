# Screenshots (2026-10-23)

Four sets.

| Folder / prefix | What it is | Status |
|---|---|---|
| `final/` | The current site: zine/brutalist-editorial homepage (D-081–D-089) with the owner's catalogue data (D-090–D-094) | **current** |
| `home-*`, `music-*` | Phase 2 revision | history |
| `phase5-*` | Phase 5 routes (`/artist`, `/visuals`, `/epk`, 404) | history — the routes still exist |
| `studio-*` | Phase 6 Studio flow (draft → publish) | current for Studio |

The `phase7-*` captures were deleted together with the effect they documented: there is no
Liquid Signal, no WebGL canvas and no particle field in the codebase any more.

## Final pass (current site)

`final/<route>-<width>.webp` is the first screen and `final/<route>-<width>-full.webp` is the whole
page, captured from the production build (`npm run build && npm run start`) with headless Chromium at
`deviceScaleFactor: 1` and `prefers-reduced-motion: reduce`. The set was regenerated after the
homepage redesign (2026-10-23): the homepage now leads with the cut-out sticker portrait over the H1,
and `/visuals` in the screenshots is the section as the archive rail presents it.

Before capturing, the script scrolls the page in 0.8 viewport steps (so lazy artwork decodes), returns
to the top, and **then** measures overflow, broken images and `canvas` count.

| Route | Widths |
|---|---|
| `/` | 390 × 844, 768 × 1024, 1280 × 900 |
| `/music` | 390, 768, 1280 |
| `/music/masih-mencintainya-papinka` | 390, 768, 1280 |
| `/artist` | 390, 768, 1280 |
| `/visuals` | 390, 768, 1280 |
| `/epk` | 390, 768, 1280 |
| `/contact` | 390, 768, 1280 |
| `/nope` (404) | 390, 768, 1280 |

All 24 route/width pairs (48 files) render with `canvas` count 0, no broken images, and no horizontal
overflow — measured on each capture, not assumed. `/music` now shows the ten-release catalogue.
Measure overflow *before* the full-page capture: headless shell resizes the viewport for it, and a
measurement taken afterwards reports a phantom 2639 px scroll width.

## Phase 6 Studio (draft → publish)

| File | What it shows |
|---|---|
| `studio-01-login.png` | `/studio/login` while signed out |
| `studio-02-dashboard.png` | Dashboard with database + password + media status |
| `studio-03-pages.png` | Page list (`/studio/pages`) |
| `studio-04-editor-filled.png` | `/studio/pages/about` with the bio editor filled in |
| `studio-05-draft-saved.png` | Same page after "Simpan draf" (status message, draft ≠ published) |
| `studio-06-preview.png` | Admin-only draft preview with the unsaved banner |
| `studio-07-published.png` | After "Terbitkan" |
| `studio-08-artist-bio.png` | `/artist` showing the published bio |
| `studio-09-media-covers.png` | `/studio/media` with the artwork checklist |

These were captured with a local `file:` database and a throwaway password. The test bio was removed
and `/artist` was re-published back to its "Yang belum ditulis" state before committing, so the
screenshots show the flow without leaving sample copy in the preview database.

## Phase 5 routes (history)

| Route | Widths |
|---|---|
| `/artist` | 390 × 844, 768 × 1024, 1280 × 900 |
| `/visuals` | 390 × 844, 768 × 1024, 1280 × 900 |
| `/epk` | 390 × 844, 768 × 1024, 1280 × 900 |
| `/tidak-ada` (404) | 390 × 844, 768 × 1024, 1280 × 900 |

`/about` is not captured because it no longer renders: it answers 308 → `/artist` (D-024).

## Phase 2 revision (history)

Captured from the local production build with headless Chromium at `deviceScaleFactor: 1`,
`prefers-reduced-motion: reduce`, after `networkidle0`.

| Route | Widths |
|---|---|
| `/` | 390 × 844, 768 × 1024, 1280 × 900 |
| `/music` | 390 × 844, 768 × 1024, 1280 × 900 |
| `/music/masih-mencintainya-papinka` | 390 × 844, 768 × 1024, 1280 × 900 |

Two files per width: `<name>-<width>.webp` is the first screen, `<name>-<width>-full.webp` is the whole
page. Files are WebP (quality 82) because the full-page PNGs were 17 MB in total; the framed edges are
identical.

These still show the dot-matrix hero field that was later removed (D-055). They are kept only as the
record of what Phase 2 was approved with.
