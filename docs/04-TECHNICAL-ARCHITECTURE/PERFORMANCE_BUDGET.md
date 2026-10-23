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

Diukur 2026-10-23 dari build produksi (`npm run build && npm run start`), versi terakhir = beranda
zine (D-081 s/d D-088). Ukuran sudah gzip. Angka Phase 8 sebelum redesign (181.1 KB JS / 9.8 KB CSS /
LCP 0.8 s desktop / 1.8 s mobile) tetap dapat dilacak di §20.1 dokumen audit.

| Metrik | Hasil | Budget |
|---|---|---|
| JS awal `/` (10 chunk) | **182.5 KB** | < 200 KB (Phase 8) — 1.4 KB dari komponen zine di D-083 |
| JS 3D / efek | **0 KB** | < 70 KB — tidak ada renderer 3D, tidak ada GSAP/Lenis |
| CSS (4 file) | **13.2 KB** | < 30 KB — naik dari 9.8 KB karena lapisan zine (tape/paper/stamp/rail) |
| LCP `/` desktop (Lighthouse preset) | **0.9 s** | < 2.5 s |
| LCP `/` mobile (Lighthouse `--throttling-method=devtools`) | **1.7 s** | < 2.5 s |
| LCP `/` mobile (simulasi Lantern, server lokal HTTP/1.1) | 3.3–3.7 s | dicatat, lihat §20.1 |
| Gambar LCP (stiker potret) | 31.6 KB AVIF / 63.7 KB WebP pada 1200w; 720w dipakai di ponsel | < 150 KB |
| `canvas` di halaman | 0 | — |
| CLS | 0 desktop / 0.002 mobile | < 0.1 |

Angka LCP diambil dari Lighthouse 12 (12.x) terhadap build produksi (lihat
`PHASE_0_AUDIT_AND_PHASE_1.md` §20.1 dan §22). Baris simulasi Lantern lebih lambat karena server lokal
memakai HTTP/1.1 dan model 562 ms RTT; dengan throttling nyata angkanya 1.8 s.

Catatan anggaran JS: 182.5 KB terdiri dari runtime Next 16 + React 19, komponen klien lama
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
