# Screenshots (2026-10-23)

Three sets. `home-*`, `music-*` are the Phase 2 revision; `phase5-*` are the Phase 5 routes added
after the revision was approved; `studio-*` are the Phase 6 Studio flow.

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

## Phase 5 routes

| Route | Widths |
|---|---|
| `/artist` | 390 × 844, 768 × 1024, 1280 × 900 |
| `/visuals` | 390 × 844, 768 × 1024, 1280 × 900 |
| `/epk` | 390 × 844, 768 × 1024, 1280 × 900 |
| `/tidak-ada` (404) | 390 × 844, 768 × 1024, 1280 × 900 |

`/about` is not captured because it no longer renders: it answers 308 → `/artist` (D-024).

## Phase 2 revision

Captured from the local production build (`npm run build && npm run start`) with headless Chromium
at `deviceScaleFactor: 1`, `prefers-reduced-motion: reduce`, after `networkidle0`.

| Route | Widths |
|---|---|
| `/` | 390 × 844, 768 × 1024, 1280 × 900 |
| `/music` | 390 × 844, 768 × 1024, 1280 × 900 |
| `/music/masih-mencintainya-papinka` | 390 × 844, 768 × 1024, 1280 × 900 |

Two files per width: `<name>-<width>.webp` is the first screen, `<name>-<width>-full.webp` is the whole
page. Files are WebP (quality 82) because the full-page PNGs were 17 MB in total; the framed edges are
identical.

The dot-matrix hero field is frozen at its reduced-motion state in these captures (static dot field,
no rotation). Without that media query it animates 1 → 1.03 scale over 6 s and 0 → 3° over 20 s.

Note on the sandbox: large image decodes occasionally fail in this particular Chromium build, which
produced blank photo tiles in earlier captures. The thumbnails served by the site are now 480 px
side, which both avoids that and matches the size the archive tile actually needs.
