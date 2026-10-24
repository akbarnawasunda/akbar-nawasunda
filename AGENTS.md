# AGENTS.md — Kontrak Kerja

**Berlaku untuk:** setiap agen yang menulis kode di repo ini.
**Didahulukan atas:** semua dokumen di `docs/` bila terjadi pertentangan. Bila ada konflik, catat —
jangan pilih diam-diam. **`docs/08-IMPLEMENTATION/DECISION_LOG.md` tidak boleh disentuh tanpa izin
pemilik.**
**Baca juga:** `CONTEXT.md` (peta repo lengkap).

Dokumen ini menggantikan versi sebelumnya. Aturan lama yang sudah tidak berlaku — **Syne**,
**purple `#7800FF`**, dan **budget JS 180 KB** — dihapus karena bertentangan dengan keputusan pemilik
dan kode yang berjalan.

---

## 0. Fakta proyek

| Hal | Nilai |
| --- | --- |
| Stack | Next **16.4** App Router · React **19** · TypeScript `strict` + `noUncheckedIndexedAccess` |
| Styling | **CSS Modules** per komponen + `src/styles/tokens.css` sebagai satu-satunya sumber nilai. **Tanpa Tailwind, tanpa PostCSS, tanpa utility class.** |
| Tipografi | Instrument Serif (display) · Instrument Sans (body) · JetBrains Mono (label) — di-host sendiri lewat `next/font/local` |
| Palet | Tinta `#050507`/`#0A0A0E` · kertas `#E8E6E1` · biru AN `#0087FF` · merah poster `#FF2D20` |
| Data | Statis di `src/content/*` (fallback) + CMS Turso/libSQL di `src/studio`. Publik **hanya** membaca data *published*. |
| Budget | **JS awal ≤ 250 KB gzip** · **CSS ≤ 40 KB gzip** · LCP < 2,5 s di Android menengah · axe 0 pelanggaran |
| Domain | `akbarnawasunda.my.id` · branch kerja `arena/e02160ef-akbar-nawasunda` · `main` = produksi |

---

## 1. DILARANG (hard fail)

1. **Jangan** tambah Tailwind, PostCSS, atau utility class. Styling hanya CSS Modules + `tokens.css`.
2. **Jangan** tulis nilai mentah di CSS Module untuk **warna, spasi, ukuran huruf, dan motion** —
   wajib `var(--token)` dari `src/styles/tokens.css`. Nilai **struktural** tetap boleh literal:
   `0`, `1px` (hairline/border), `100%`, `50%`, `auto`, `env(safe-area-inset-*)`, serta angka di dalam
   `translate`/`scale`/`rotate`/`calc()` untuk offset dan transform.
3. **Jangan** bikin `src/hooks/`. Hook kustom hidup di dalam komponen pemiliknya (`scroll-engine.ts`,
   `Plate3D`, `CatalogueIndex`).
4. **Jangan** pakai `@media (hover: none)` atau `matchMedia("(hover: none)")`. Pakai
   `event.pointerType` (`"mouse"` / `"pen"`). Untuk menyembunyikan fitur di perangkat sentuh, uji
   `max-width` atau `pointer: coarse` di CSS, bukan `hover: none`.
5. **Jangan** bikin `requestAnimationFrame` loop baru. Loop scroll untuk seluruh situs ada di
   `scroll-engine.ts` (`registerDepth`, `registerPin`). Loop milik satu komponen yang **sudah ada**
   boleh diperluas, tidak boleh diduplikasi.
6. **Jangan** bikin komponen 3D baru dari nol. Yang tersedia: `Plate3D` (CSS 3D), `Tilt3D`, `Depth`,
   `AnMonogram` (`<canvas>` three.js satu-satunya di situs).
7. **Jangan** taruh komponen publik di `src/app/studio/`. Layout `(site)` dan `studio` terpisah.
8. **Jangan** karang data rilis, penghargaan, angka pendengar, atau kutipan pers. `[NEEDS OWNER: ...]`
   adalah pernyataan jujur, bukan placeholder.
9. **Jangan** pakai `position: fixed` di dalam ancestor ber-`perspective`, `filter`, `backdrop-filter`,
   `transform`, atau `will-change` — ancestor seperti itu menjadi *containing block*. Pakai portal ke
   `<body>`.
10. **Jangan** sentuh `docs/08-IMPLEMENTATION/DECISION_LOG.md` tanpa izin.

---

## 2. WAJIB (harus ada sebelum lapor selesai)

1. Semua warna/spasi/tipe/motion dari `tokens.css` → `npm run audit:tokens` lulus.
2. `npm run typecheck` lulus · `npm run lint` lulus.
3. `npm run a11y` lulus (**16 pemuatan**, termasuk menu ponsel dan sisi belakang dalam keadaan terbuka).
4. `npm run qa:motion` lulus (**22 asersi**).
5. Screenshot lewat `npm run review:shots` sebelum lapor selesai; bandingkan dengan referensi.
6. Menyentuh 3D → pakai `Plate3D` atau `AnMonogram` yang ada. **Jangan** bikin canvas baru.
7. Menyentuh animasi scroll → daftarkan ke `scroll-engine.ts`. **Jangan** bikin rAF sendiri.
8. `prefers-reduced-motion: reduce` harus menghasilkan keadaan diam yang tetap terbaca lengkap.
9. Semua konten tetap terbaca tanpa WebGL.
10. Menyentuh gerak/3D/blur → jalankan `npm run perf:audit` sebelum dan sesudah, lampirkan angkanya.
    Alat ini bukan gerbang (tidak menggagalkan build), tapi klaim "lebih ringan" tanpa angka tidak
    dihitung.

---

## 3. Alur kerja wajib

1. Baca `AGENTS.md` + `CONTEXT.md` + **komponen target** sebelum menulis apa pun.
2. Tulis **PLAN** (file yang diubah, alasannya, komponen yang dipakai ulang) → tunggu persetujuan.
3. Implementasi satu file per langkah.
4. Setelah setiap file: `typecheck` + `lint` + `audit:tokens`.
5. `review:shots` → bandingkan → revisi.
6. Baru buka PR. Tanpa persetujuan eksplisit: jangan merge ke `main`, jangan deploy produksi.

---

## 4. Status kepatuhan (utang yang diketahui, per R11)

Jujur lebih berguna daripada bersih di atas kertas. Dua pelanggaran kontrak ini sudah ada di `HEAD`
dan **belum** diperbaiki:

| Aturan | Lokasi | Catatan |
| --- | --- | --- |
| 4 | `src/components/zine/Tilt3D.tsx:30` | `matchMedia("(hover: none)")` sebagai gerbang di mount — di Chromium headless nilainya `true`, jadi tilt mati saat diuji |
| 4 | `src/components/zine/SmoothScroll.tsx:19` | idem; di sini maksudnya "jangan jalankan Lenis di perangkat sentuh" |
| 5 | `Plate3D`, `AnMonogram`, `CursorDot`, `InkPress`, `SmoothScroll`, `Tilt3D` | masing-masing punya loop rAF sendiri; hanya `Depth`, `VisualRail`, `ReleaseTicker` memakai `scroll-engine` |
| 2 | 36 modul CSS | ~734 nilai `px/rem/ms` mentah. Guard `audit:tokens` saat ini **hanya** memeriksa hex, jadi angka ini belum ditegakkan otomatis |

Aturan 1, 3, 6, 7, 8, 9, 10 sudah terpenuhi. `Plate3D.module.css` sudah bersih dari `@media (hover: none)`
sejak R11 — blok itu dihapus bersama `will-change` permanen yang menjadi alasan keberadaannya.

---

## 5. Definisi selesai

Kode ada + seluruh poin §2 lulus + screenshot desktop & mobile + tanpa error konsol + budget tidak
terlampaui + tidak menambah utang baru ke tabel §4.
