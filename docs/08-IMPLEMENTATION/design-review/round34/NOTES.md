# Round 34 — release-first platform

Owner's brief: **jadikan beranda seperti martingarrix.com** — platform rilis dan jadwal, bukan
halaman press. Dikerjakan bertahap, gerbang hijau di akhir. Tanpa Tailwind, tanpa PostCSS, semua
nilai dari `src/styles/tokens.css`.

## Apa yang berubah, per langkah

| Langkah | Perubahan | File |
| --- | --- | --- |
| 1 · P0 katalog | Satu modul `catalogue.ts` jadi satu-satunya sumber katalog publik: baris Studio yang published lebih dulu, daftar statis sebagai fallback. `/music` dan `/` sama-sama memanggil `getCatalogue()`; sebelumnya beranda menyusun daftarnya sendiri dari `releases.ts`, dan itu cara sebuah rilis bisa *publish* ke katalog tanpa pernah muncul di beranda. Tautan diurutkan streaming-first (Spotify → Apple Music → YouTube → SoundCloud → sisanya), tidak ada tautan yang dikarang. | `src/content/catalogue.ts` (baru), `src/app/(site)/music/page.tsx` |
| 2 · Data tur | `tourDates` (7 tanggal, musim pembuka: Bandung Barat, Bandung City, Jakarta ×2, Bali, Surabaya, Yogyakarta) + `TourStatus` himpunan tertutup (`TICKETS`, `FREE`, `TBA`, `SOLD OUT`), `formatTourDate` (UTC-aman, `id-ID`), `tourDateIsLinkable`. | `src/content/tour.ts` (baru) |
| 3 · Matriks tur | Tabel semantik `<table>`: Tanggal (mono, tabular) · Kota · Tempat · Status. Hairline 1px per baris; hover = wash baris + garis laser 1px di tepi kiri/kanan baris (inset box-shadow, bukan border, supaya tidak menggeser layout). `TBA`/`SOLD OUT` **bukan** tautan. Di bawah 720px baris jadi daftar bertumpuk dengan label `data-label`. | `src/components/content/TourSection.tsx` + `.module.css` (baru) |
| 4 · Beranda | Hero: `[LATEST RELEASE]` → `#music`, `[TOUR DATES]` → `#tour`, nama di `--text-mega`; `factsBar` (jumlah rilis, tahun aktif) dihapus. Band monogram tetap menempel tanpa celah di bawah hero, lalu `ReleaseTicker`. Spotlight rilis baru `#music`: sleeve persegi setengah lebar dengan pelat offset (satu-satunya "bayangan" di situs), spesifikasi Tahun/Format/Katalog, pil streaming, dua aksi. `TourSection` dipasang di `#tour`. `CataloguePin` dan `VisualRail` dipertahankan. | `src/app/(site)/page.tsx`, `page.module.css` |
| 5 · Tokens | `--font-mono-stack`, `--color-row-hover`, `--color-laser`, `--text-mega`. `--color-night` tetap dipakai: sekarang jadi alas band spotlight. | `src/styles/tokens.css` |

## Yang dihapus, dan alasannya

- **`PaperAbout`** dari beranda — bio panjang hidup di `/artist` dan `/epk`; dua salinan berarti dua
  versi yang akan berbeda.
- **`section#press`** — `/epk` sudah jadi rute nyata; satu baris tautan lebih jujur daripada ringkasan
  press yang tidak lengkap.
- **`section.night`** — satu foto penuh layar dengan satu kutipan dan nol informasi.
- **`factsBar`** — jumlah rilis dan tahun aktif adalah isi CV, bukan panggung.

Tidak ada tautan internal yang menunjuk `#press` / `#about` / bagian yang hilang (diperiksa dengan
`grep` atas seluruh `src/`), jadi tidak ada jangkar mati.

## Bug kecil yang ikut terbongkar

Tombol YouTube di beranda (aksi header arsip visual) tidak pernah tampil: kode lama mencari
`platform: "youtube"` di `socialLinks`, sedangkan kanal itu ada di `listenLinks`. Sekarang lewat
`getPlatformLink("youtube")`, dan baris pil streaming memakai `getPlatformLink` untuk mengisi empat
layanan utama ketika rilis tidak membawa tautannya sendiri.

## Gerbang

```
audit:tokens  ✓ 121 tokens, no raw hex, no orphaned tokens
typecheck     ✓
lint          ✓
test          ✓ 138/138 (6 tes baru: tests/studio/tour.test.ts)
build         ✓ (2 warning Turbopack lama dari src/content/covers.ts)
assets:check  ✓
```

`tests/fixtures/anti-ai.ts` tetap hijau untuk berkas beranda: tidak ada `radial-gradient`,
`backdrop-filter`, `mix-blend-mode`, `filter: blur(`, `<canvas`, atau animasi `infinite`. Efek laser
tour hanya `background` + `inset box-shadow`.

Screenshot browser **tidak bisa** diambil di sandbox ini (tidak ada Chromium/Firefox sistem, apt
diblokir), jadi tidak ada klaim visual berbasis tangkapan layar. Verifikasi dilakukan pada HTML hasil
`next start`: `id="music"`/`id="tour"`/`id="catalogue"`/`id="visuals"` ada, empat pil streaming
(Spotify, Apple Music, YouTube, SoundCloud) dan tujuh baris tur terender.
