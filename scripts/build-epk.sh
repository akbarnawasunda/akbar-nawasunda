#!/usr/bin/env bash
# Builds the Electronic Press Kit downloadable from /epk.
#
#   bash scripts/build-epk.sh
#
# Outputs are committed (public/epk) because they are user-facing downloads, not build artefacts:
# the page links straight to the files, and a press kit that changes on every deploy is worse than
# one that is versioned with the code. Re-run this script only when an original asset changes.
#
# Requires ImageMagick (convert) and zip.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Round 40 (audit P0-3): the owner's originals live in ONE place, AKBAR-NAWASUNDA-ASSETS/, outside
# public/ and outside docs/. They used to be split — the two logo PNGs and the 1200 px portrait in
# docs/05-CONTENT-AND-ASSETS/assets, the rest here — so "which copy is the master?" had two answers.
SRC="$ROOT/AKBAR-NAWASUNDA-ASSETS"
MEDIA="$ROOT/public/media"
OUT="$ROOT/public/epk"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"

# Press photo: one web file for online use, one larger JPEG for print. Both are the official
# portrait; nothing is cropped through the face (CONTENT_GUIDELINES.md).
cp "$MEDIA/portrait-960.webp" "$OUT/press-photo-web.webp"
convert "$SRC/akbar-nawasunda-official-portrait-1200.webp" -resize 1200x -quality 88 -strip "$OUT/press-photo-print.jpg"

# Logos: transparent PNG, trimmed to the artwork so they can be dropped onto any background.
# 256 colours is visually identical to the originals (a black glyph with one blue gradient tip) and
# takes the pair from 1.4 MB to ~0.5 MB, which matters for a file people download on mobile data.
convert "$SRC/akbar-an-mark-transparent.png" -trim +repage -strip -colors 256 -define png:compression-level=9 "$OUT/an-mark-transparent.png"
convert "$SRC/akbar-nawasunda-full-transparent.png" -trim +repage -strip -colors 256 -define png:compression-level=9 "$OUT/lockup-transparent.png"

# Fact sheet: facts only, no written bio (the long bio is still [NEEDS OWNER]).
cat > "$TMP/README.md" <<'TXT'
# Akbar Nawasunda — press kit

Produser, remixer, dan DJ asal Bandung Barat, Indonesia. Breakbeat, Indo Bass, Jedag Jedug,
Jungle Dutch. Aktif sejak 2020. Alias: DJ Akbar Remix.

## Isi paket
- press-photo-print.jpg   potret resmi, 1200 px, untuk cetak
- press-photo-web.webp    potret resmi, 960 px, untuk web
- an-mark-transparent.png monogram AN, latar transparan
- lockup-transparent.png  lockup AN + wordmark, latar transparan

## Fakta terverifikasi
- Nama panggung: Akbar Nawasunda
- Nama legal: Idel Akbar Ramadan
- Alias: DJ Akbar Remix
- Basis: Bandung Barat, Indonesia
- Aktif sejak: 2020
- Genre: Breakbeat, Indo Bass
- Situs: https://akbarnawasunda.my.id
- Spotify: https://open.spotify.com/intl-id/artist/7KOQuIQLuxyklLox0RDMMw
- YouTube: https://www.youtube.com/@akbarnawasunda
- SoundCloud: https://soundcloud.com/akbarnawasunda
- TikTok: https://www.tiktok.com/@akbarnawasunda

## Catatan
Bio panjang, kontak booking, dan daftar rilis lengkap menyusul. Mohon jangan menambahkan
angka pendengar, penghargaan, atau tautan platform di luar daftar di atas.

© Akbar Nawasunda. Foto dan logo boleh dipakai untuk pemberitaan dan promosi yang menyebut
Akbar Nawasunda.
TXT

# Zip: press kit root at the top level, no redundant folder nesting.
rm -f "$OUT/akbar-nawasunda-epk.zip"
(
  cd "$OUT"
  zip -q -X -9 "$OUT/akbar-nawasunda-epk.zip" \
    press-photo-print.jpg \
    press-photo-web.webp \
    an-mark-transparent.png \
    lockup-transparent.png
  cd "$TMP"
  zip -q -X -9 "$OUT/akbar-nawasunda-epk.zip" README.md
)

echo "EPK built:"
ls -lh "$OUT"
