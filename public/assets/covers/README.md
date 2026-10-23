# COVERS — ARTWORK PER RILIS

## Cara kerja (waterfall):
1. Manual: public/assets/covers/<slug>.webp — jika ada pakai ini (owner drop)
2. Auto Spotify: scripts/fetch-spotify-artwork.js fetch dari Spotify oEmbed thumbnail_url ke <slug>.webp
3. Auto Generated: AN ghost 10% + title + gradient border #0087FF->#7800FF jika 1 dan 2 tidak ada

## Slug yang harus ada:
- masih-mencintainya-papinka
- cinta-terbuang
- masih-dihatiku
- bayang-tanpa-kata
- pada-imut-aisyah-tak-belagu
- hitungan-cinta-breakbeat-super-exc

## Format:
800x800 1:1 WebP, max 150KB, sRGB

## Script:
npm run fetch:covers — fetch dari Spotify jika belum ada manual
