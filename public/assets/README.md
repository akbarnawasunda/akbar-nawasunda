# public/assets — the owner's asset shelf

Files here are copies of owner-supplied originals, kept at the names the brief uses so nothing has to
be hunted for. They are **not** the files the site renders: the pages use the smaller, correctly sized
derivatives in `public/brand/` and `public/media/` (built by `scripts/build-web-assets.sh`).

| File | What it is | Used by |
|---|---|---|
| `akbar-nawasunda-official-portrait.webp` / `.jpg` / `-1200.webp` | official portrait, 1200 px wide | reference / downloads |
| `akbar-an-mark-transparent.png` | AN monogram, transparent, 800 px | source for `public/brand/an-mark.webp` |
| `akbar-nawasunda-full-transparent.png` | full lockup, transparent, 1200 px | source for `public/brand/lockup.webp` |
| `logo-an.png` | full lockup on a **white** background | reference only — see the note below |
| `akbar-logo.webp`, `akbar-logo-fallback.webp` | compact wordmark | reference |
| `akbar-rmx-mark.webp` | RMX tag | reference |
| `akbar-night-frequency-hero.webp`, `-mobile.webp` | night street photograph | same photograph as the `/media/stage-*` frame |
| `akbar-editorial-stage-bg.webp` | empty stage under one spot | `/media/editorial-*` |
| `covers/` | release artwork slots + generated sleeves | every release surface |

## Notes

- **`logo-an.png` is a JPEG with a `.png` extension** (a finding from the asset audit, not a mistake
  introduced here). It also has a white background, so it can never be used as a 10% watermark on a
  dark page. The watermark and the nav mark both come from the transparent AN file instead.
- Large originals were downscaled when copied (portrait 1200 px, hero 1400 px, transparent marks
  800/1200 px). The untouched masters stay in `AKBAR-NAWASUNDA-ASSETS/`, which
  `npm run assets:check` verifies byte for byte.
- `covers/` has its own README describing the four-level artwork waterfall.
