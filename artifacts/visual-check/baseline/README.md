# Baseline — kondisi situs sebelum perbaikan apa pun

Diambil 2026-10-28 pada commit `3862d22` (isi kode = `ca74742`, sebelum Langkah 3 dimulai).

Empat file ini **sengaja di-force-add** melewati `.gitignore` (`/artifacts/`), karena merekalah
"before" yang tidak bisa dibuat ulang lagi setelah hero dan ledger diubah. Sisanya (10 file lain +
`report.json`) tidak di-commit karena bisa diregenerasi kapan saja dengan perintah di bawah.

| File | Isi | Ukuran |
| --- | --- | --- |
| `home-1440.png` | hero `/` 1440×900 | 1 248 356 B |
| `home-390.png` | hero `/` 390×844 | 280 799 B |
| `music-1440.png` | `/music` 1440×900 | 889 256 B |
| `music-390.png` | `/music` 390×844 | 224 535 B |

Cara membuat ulang seluruh set:

```bash
npm ci
npm run build
npm run start &            # atau: npx next start -H 0.0.0.0 -p 3000
npm run visual:setup       # unpack Chromium (sekali per sandbox)
npm run visual:check -- --category baseline
```

Hasil yang tercatat saat pengambilan: 14/14 PNG valid, 0 console error, 0 page error,
0 request error, 0 axe violation (7 route × 1440/390). Detail: `docs/VISUAL-VERIFICATION.md`.

Yang terlihat di `home-1440.png` (dibuka dan diperiksa di sesi 2026-10-28, vision aktif):
header dengan AN mark + `AKBAR NAWASUNDA` + pill LISTEN + MENU; baris kicker
`BANDUNG BARAT · SEJAK 2020` / `PRODUCER · REMIXER · DJ`; foto panggung monokrom gelap dengan satu
spotlight; wordmark dua baris `AKBAR` / `NAWASUNDA.` (titik biru); sub-copy dua baris; dua tombol
`DENGAR SEKARANG` / `LIHAT KATALOG`; dan di tepi bawah, awal strip angka `10  6  14`.

Catatan untuk Langkah 3: `music-1440.png` memperlihatkan `/music` sebagai wall sleeve dua kolom
dengan perspektif — **bukan** ledger baris berwatermark seperti yang diminta `docs/DESIGN.md` §3.
