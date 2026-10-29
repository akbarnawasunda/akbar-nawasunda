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
for w in 480 600 720 960; do
  convert "$SRC/akbar-nawasunda-official-portrait-1200.webp" -resize "${w}x" -quality 78 "$MEDIA/portrait-$w.webp"
  convert "$SRC/akbar-nawasunda-official-portrait-1200.webp" -resize "${w}x" -quality 55 "$MEDIA/portrait-$w.avif"
done

# Visual-archive frame used below the fold on the homepage. Two sizes: 480 for the archive tile,
# 700 for the lightbox view.
for w in 480 700; do
  convert "$STAGE_SRC/akbar-night-frequency-stage-optimized.webp" -resize "${w}x${w}" -quality 70 "$MEDIA/stage-$w.webp"
  convert "$STAGE_SRC/akbar-night-frequency-stage-optimized.webp" -resize "${w}x${w}" -quality 45 "$MEDIA/stage-$w.avif"
done

# Archive frames added for the /visuals masonry (final pass). Same rule: owner originals in,
# web-sized derivatives out. The lightbox gets the large file, the tile gets the small one.
# The night-frequency hero file is byte-for-byte the same photograph as the stage frame above, so it
# is not shipped a second time: one photograph, one tile.

# Sticker portrait: owner-supplied PNG cut out of its background, with the hand-drawn white and
# black outline baked in. Transparency must survive in *both* formats.
#
# The AVIFs are not made here: ImageMagick's AVIF delegate flattens alpha onto black, so the hero
# rendered a black rectangle around the cut-out (D-109). scripts/build-sticker-avif.mjs does those
# four files with sharp and fails loudly if a channel is lost.
for w in 480 720 960 1200; do
  convert "$STAGE_SRC/akbar-nawasunda-sticker-portrait.png" -resize "${w}x" -quality 82 "$MEDIA/sticker-$w.webp"
done
node "$ROOT/scripts/build-sticker-avif.mjs"

# Editorial stage backdrop: 1600x900 landscape.
for w in 720 1400; do
  convert "$STAGE_SRC/akbar-editorial-stage-bg.webp" -resize "${w}x" -quality 74 "$MEDIA/editorial-$w.webp"
  convert "$STAGE_SRC/akbar-editorial-stage-bg.webp" -resize "${w}x" -quality 50 "$MEDIA/editorial-$w.avif"
done

# Mascot doodle: the one drawn asset, 420x420, shown at its native size.
convert "$STAGE_SRC/akbar-mascot-doodle.webp" -quality 82 "$MEDIA/mascot-420.webp"

# Langkah 3k: the visual archive's own derivatives (an-mark-960, lockup-960, stage-1000). They are
# built by a sharp script rather than ImageMagick because they are trimmed-then-resized line art and
# a 1440 px photograph, and doing it in one place keeps their recorded sizes in src/assets/web.ts
# honest. Never wired into a build: run it deliberately when an original changes.
node "$ROOT/scripts/build-archive-hires.mjs"

echo "Built:"
ls -l "$BRAND" "$MEDIA"
