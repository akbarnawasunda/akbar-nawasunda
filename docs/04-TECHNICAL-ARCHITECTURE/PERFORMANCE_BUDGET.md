# PERFORMANCE_BUDGET

- JS initial (public): <180kb gzipped
- JS 3D chunk: <70kb gzipped extra, loaded after interaction or idle (tidak dipakai lagi sejak D-055: situs tidak punya 3D)
- CSS: <30kb
- Image LCP: <150kb WebP, preload
- LCP <2.5s on Moto G4 4G
- CLS <0.1
- INP <200ms
- 3D init <1.2s, FPS >45 mid device, memory <80MB GPU
- If budget exceeded, 3D falls back to static.

Measurement: Lighthouse + Web Vitals + Chrome Perf tab. Document results in QA.

## Hasil terukur

Diukur 2026-10-24 dari build produksi (`npm run build && npm run start`), versi terakhir = beranda
zine (D-081 s/d D-089) dengan katalog 10 rilis milik owner (D-090 s/d D-094). Ukuran sudah gzip.
Angka Phase 8 sebelum redesign (181.1 KB JS / 9.8 KB CSS / LCP 0.8 s desktop / 1.8 s mobile) tetap
dapat dilacak di §20.1 dokumen audit.

| Metrik | Hasil | Budget |
|---|---|---|
| JS awal `/` (13 chunk, HTML saja — tanpa chunk 3D) | **201 KB gz** | < 250 KB (round 3) / < 200 KB (Phase 8, terlampaui 1 KB) |
| JS lazy 3D (chunk `three`) | **0 KB — round 20 menghapus renderer-nya** (sebelumnya 78.7 KB gz lazy) | lihat D-096 dan addendum round 20 di bawah |
| CSS (3 file) | **14.3 KB gz** | < 40 KB (round 3) / < 30 KB (Phase 8) |
| LCP `/` desktop (Lighthouse preset) | **0.9 s** | < 2.5 s |
| LCP `/` mobile (simulasi Lantern, server lokal HTTP/1.1) | **3.4 s** (skor 90) | dicatat, lihat §20.1 |
| Gambar LCP (stiker potret) | 31.6 KB AVIF / 63.7 KB WebP pada 1200w; 480–720w dipakai di ponsel | < 150 KB |
| `canvas` di halaman, kapan pun | **0** — permanen sejak round 20 (renderer dihapus, monogram = WebP bake) | 1 (round 3) dulu |
| TBT `/` | **0–10 ms** | < 200 ms |
| CLS | 0 desktop / 0.009 mobile | < 0.1 |

Skor Lighthouse terukur (2026-10-24, build produksi, `next start`):

| Preset | Perf | A11y | Best practices | SEO |
|---|---|---|---|---|
| Desktop | 98 | 100 | 100 | 100 |
| Mobile (Lantern, Moto G4) | 90 | 100 | 100 | 100 |

Catatan round 3 (D-095…D-100): dua angka bergerak. (1) Anggaran JS dinaikkan owner dari 200 KB → 250 KB
untuk round ini; terpakai 201 KB, jadi 1 KB di atas angka Phase 8 dan 49 KB di bawah angka baru. (2)
`three` menambah 78.7 KB gz yang **tidak** masuk jalur awal: scene baru di-`import()` ketika halaman sudah
`load` **dan** band monogram masuk viewport. Tanpa gerbang kedua, TBT desktop terukur 2.100 ms dan skor
turun ke 66 — jadi gerbang itu bukan optimasi opsional, itu syarat anggaran. GSAP/Lenis: Lenis dipasang
(~10 KB gz, inersia roda), GSAP **tidak** (D-097).

Angka LCP diambil dari Lighthouse 12 (12.x) terhadap build produksi (lihat
`PHASE_0_AUDIT_AND_PHASE_1.md` §20.1 dan §22). Baris simulasi Lantern lebih lambat karena server lokal
memakai HTTP/1.1 dan model 562 ms RTT; dengan throttling nyata angkanya 1.8 s.

Catatan anggaran JS: 182 KB terdiri dari runtime Next 16 + React 19, komponen klien lama
(nav/drawer, lightbox visual, grid) dan lima komponen klien baru dari lapisan zine (progress bar,
kursor titik, `Reveal`, `Magnetic`, rail arsip). Anggaran 180 KB lama tidak realistis untuk App Router;
owner menetapkan 200 KB pada Phase 8, dan sisa ruang ~19 KB itu yang boleh dipakai fitur berikutnya.
Halaman juga masih dirender dinamis (ƒ) karena membaca konten Studio per request; membuatnya statis
akan memotong TTFB lebih jauh kalau nanti dibutuhkan.

FPS perangkat nyata (Snapdragon 680 / Moto G4) tetap tidak relevan: tidak ada animasi WebGL. Gerak di
beranda zine seluruhnya deklaratif — transisi CSS 200–400 ms, satu marquee 46 s yang berhenti saat
hover/fokus dan mati pada `prefers-reduced-motion`, satu `Reveal` berbasis IntersectionObserver, dan
`animation-timeline: scroll()` untuk mengecilkan header (dijalankan compositor, tanpa scroll listener).

Satu catatan biaya cat: `filter: drop-shadow(0 24px 40px)` pada potret LCP diukur memakan ~2 poin
Lighthouse mobile (LCP 3.7 s → 3.5 s, TBT 70 → 40 ms pada simulasi Lantern). Blur diturunkan ke 12 px;
tidak ada beda visual di atas `#050507`.
