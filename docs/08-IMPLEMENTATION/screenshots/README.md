# Screenshots — Phase 2 revision (2026-10-23)

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
