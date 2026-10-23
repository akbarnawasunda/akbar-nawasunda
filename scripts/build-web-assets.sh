#!/usr/bin/env bash
# Regenerates the web-ready brand assets in public/brand and public/media from the
# owner-supplied originals. Originals are never modified.
#
#   bash scripts/build-web-assets.sh
#
# Requires ImageMagick (convert) with WebP and AVIF support.
# Budget (docs/04-TECHNICAL-ARCHITECTURE/PERFORMANCE_BUDGET.md): LCP image < 150 KB per file.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/docs/05-CONTENT-AND-ASSETS/assets"
STAGE_SRC="$ROOT/AKBAR-NAWASUNDA-ASSETS"
BRAND="$ROOT/public/brand"
MEDIA="$ROOT/public/media"

mkdir -p "$BRAND" "$MEDIA"

# AN mark: trim the transparent padding so the glyph fills its box, then rasterise at 2-4x the
# 32px nav size. Lossless WebP keeps the 1px white stroke crisp.
convert "$SRC/akbar-an-mark-transparent.png" \
  -trim +repage -resize x112 -define webp:lossless=true "$BRAND/an-mark.webp"

# Full lockup (mark + wordmark + RMX tag): footer / EPK use only, never the nav.
convert "$SRC/akbar-nawasunda-full-transparent.png" \
  -trim +repage -resize 400x -quality 92 "$BRAND/lockup.webp"

# Official portrait: three widths, WebP + AVIF. Delivered through a hand-written srcset so the
# bytes are exactly what this script produced (no build-time image optimizer in the path).
for w in 480 720 960; do
  convert "$SRC/akbar-nawasunda-official-portrait-1200.webp" -resize "${w}x" -quality 78 "$MEDIA/portrait-$w.webp"
  convert "$SRC/akbar-nawasunda-official-portrait-1200.webp" -resize "${w}x" -quality 55 "$MEDIA/portrait-$w.avif"
done

# Visual-archive frame used below the fold on the homepage (lazy, decorative). Square artwork, so a
# single 700px side is enough for the column it is displayed in.
convert "$STAGE_SRC/akbar-night-frequency-stage-optimized.webp" -resize 700x700 -quality 70 "$MEDIA/stage-700.webp"
convert "$STAGE_SRC/akbar-night-frequency-stage-optimized.webp" -resize 700x700 -quality 45 "$MEDIA/stage-700.avif"

echo "Built:"
ls -l "$BRAND" "$MEDIA"
