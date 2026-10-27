# ASSET_INVENTORY

**Update 2026-10-23:** aset asli sudah ada di repo. Dua folder hidup berdampingan (D-015):

| Folder | Isi | Dipakai oleh |
|---|---|---|
| `docs/05-CONTENT-AND-ASSETS/assets/` | AN mark transparan, full lockup transparan, portrait 1200px, master JPG, favicon | Sumber turunan web terbaru |
| `AKBAR-NAWASUNDA-ASSETS/` | 19 file brand lama + artwork panggung, poster, mascot | `src/assets/manifest.ts` + `scripts/check-assets.mjs` |

## Turunan web (dipakai situs) — dibuat oleh `scripts/build-web-assets.sh`

| File | Dimensi | Berat | Peran |
|---|---|---|---|
| `public/brand/an-mark.webp` | 174x112 | 13 KB | nav 32px (lossless) |
| `public/brand/lockup.webp` | 400x303 | 33 KB | footer (bukan nav) |
| `public/media/portrait-480.webp` / `.avif` | 480x600 | 27 / 19 KB | hero HP |
| `public/media/portrait-720.webp` / `.avif` | 720x899 | 74 / 55 KB | hero tablet |
| `public/media/portrait-960.webp` / `.avif` | 960x1199 | 146 / 106 KB | hero desktop (≤150 KB budget) |
| `public/media/stage-700.webp` / `.avif` | 700x700 | 89 / 51 KB | pita visual (lazy) |

Aturan pemakaian:

- AN mark = satu-satunya logo di nav; jangan pakai JPG background putih di dark mode.
- Full lockup hanya footer / EPK / konteks history (berisi tag RMX).
- Portrait hanya di hero, tidak diulang, tidak di-crop melewati wajah.
- Asli di `docs/` dan `AKBAR-NAWASUNDA-ASSETS/` **tidak boleh ditimpa** oleh skrip.

## Masih ditunggu dari owner

- [NEEDS OWNER] Artwork cover per rilis (sekarang kartu katalog tipografis, tanpa cover palsu)
- [NEEDS OWNER] Foto panggung / dokumentasi visual terbaru untuk `/visuals`
- [NEEDS OWNER] Logo versi putih solid untuk latar gelap (sekarang pakai mark transparan)
