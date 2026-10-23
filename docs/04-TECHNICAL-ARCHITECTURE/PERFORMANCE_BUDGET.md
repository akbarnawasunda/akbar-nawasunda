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
| JS awal `/` (10 chunk) | **181.1 KB** | < 180 KB — masih 1.1 KB di atas, berasal dari framework Next 16 + React 19 |
| JS 3D / efek | **0 KB** | < 70 KB — tidak ada lagi renderer 3D di situs |
| CSS (3 file) | **9.8 KB** | < 30 KB |
| LCP `/` 390×844 DPR2, 1.6 Mbps, CPU 4× | **0.42 s** (FCP 0.27 s) — request pertama setelah server start 1.8 s | < 2.5 s |
| Gambar LCP | 27 KB (480w) / 74 KB (720w) / 146 KB (960w) | < 150 KB |
| `canvas` di halaman | 0 | — |
| CLS | 0 by design | < 0.1 |

Angka LCP diambil dari request hangat (`next start`, halaman sudah pernah dirender). Request pertama
setelah proses start membayar kompilasi/pre-render dan sempat menyentuh 1.8 s — itu sifat server
lokal, bukan halaman; di Vercel halaman ini disajikan statis.

Catatan: angka 180.2 KB sudah tercatat sejak Phase 1 dan Phase 7 sempat menambah 1.6 KB untuk
wrapper WebGL; keduanya kini hilang lagi. Sisa 1.1 KB di atas budget tetap pekerjaan Phase 8
(audit bundle), bukan sesuatu yang diselesaikan dengan menaikkan budget.

FPS perangkat nyata (Snapdragon 680 / Moto G4) tidak lagi relevan untuk halaman ini karena tidak ada
lagi animasi WebGL; satu-satunya gerak adalah transisi CSS 200–400 ms pada hover dan drawer.
