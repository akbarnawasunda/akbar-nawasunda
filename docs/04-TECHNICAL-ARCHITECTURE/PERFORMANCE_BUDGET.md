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

Diukur 2026-10-23 dari build produksi (`npm run build && npm run start`), sesudah Liquid Signal
dihapus (D-055). Ukuran sudah gzip.

| Metrik | Hasil | Budget |
|---|---|---|
| JS awal `/` (10 chunk) | **181.1 KB** | < 200 KB (Phase 8) — 1.1 KB di atas anggaran lama 180 KB, dari framework Next 16 + React 19 |
| JS 3D / efek | **0 KB** | < 70 KB — tidak ada lagi renderer 3D di situs |
| CSS (3 file) | **9.8 KB** | < 30 KB |
| LCP `/` desktop (Lighthouse preset) | **0.8 s** | < 2.5 s |
| LCP `/` mobile (Lighthouse `--throttling-method=devtools`) | **1.8 s** | < 2.5 s |
| LCP `/` mobile (simulasi Lantern, server lokal HTTP/1.1) | 3.5 s | dicatat, lihat §20.1 |
| Gambar LCP | 27 KB (480w) / 74 KB (720w) / 146 KB (960w) | < 150 KB |
| `canvas` di halaman | 0 | — |
| CLS | 0 by design | < 0.1 |

Angka LCP Phase 8 diambil dari Lighthouse 12 terhadap build produksi (lihat
`PHASE_0_AUDIT_AND_PHASE_1.md` §20.1). Baris simulasi Lantern lebih lambat karena server lokal
memakai HTTP/1.1 dan model 562 ms RTT; dengan throttling nyata angkanya 1.8 s.

Catatan anggaran JS: 181.1 KB terdiri dari runtime Next 16 + React 19 dan tiga komponen klien
(nav/drawer, lightbox visual, dan grid). Anggaran 180 KB lama tidak realistis untuk App Router;
owner menetapkan 200 KB pada Phase 8, dan sisa ruang ~19 KB itu yang boleh dipakai fitur berikutnya.
Halaman juga masih dirender dinamis (ƒ) karena membaca konten Studio per request; membuatnya statis
akan memotong TTFB lebih jauh kalau nanti dibutuhkan.

FPS perangkat nyata (Snapdragon 680 / Moto G4) tidak lagi relevan untuk halaman ini karena tidak ada
lagi animasi WebGL; satu-satunya gerak adalah transisi CSS 200–400 ms pada hover dan drawer.
