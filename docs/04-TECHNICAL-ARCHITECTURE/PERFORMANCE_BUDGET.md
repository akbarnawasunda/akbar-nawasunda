# PERFORMANCE_BUDGET

- JS initial (public): <180kb gzipped
- JS 3D chunk: <70kb gzipped extra, loaded after interaction or idle
- CSS: <30kb
- Image LCP: <150kb WebP, preload
- LCP <2.5s on Moto G4 4G
- CLS <0.1
- INP <200ms
- 3D init <1.2s, FPS >45 mid device, memory <80MB GPU
- If budget exceeded, 3D falls back to static.

Measurement: Lighthouse + Web Vitals + Chrome Perf tab. Document results in QA.

## Hasil terukur

| Tanggal | Metrik | Hasil | Catatan |
|---|---|---|---|
| 2026-10-23 | JS awal `/` | 182.7 KB gz (181.1 KB tanpa wrapper 3D) | 10 chunk; sudah 180.2 KB sejak Phase 1 — Phase 8 wajib menurunkannya |
| 2026-10-23 | Chunk Liquid Signal (dinamis) | **3.1 KB gz** | Tidak ada di HTML awal; dimuat setelah `load` + idle |
| 2026-10-23 | LCP `/` 390×844 DPR2, 1.6 Mbps, CPU 4× | 1.80 s | FCP 0.74 s, load 2.62 s |
| 2026-10-23 | CSS | 6.7 KB gz | Tidak berubah di Phase 7 |
| 2026-10-23 | Buffer vertex 3D | 0.8 MB (5.600 titik) | Dialokasikan sekali per resize |

Catatan: pengukuran FPS di perangkat nyata (Snapdragon 680 / Moto G4) masih terbuka; governor
fallback <30 FPS untuk 2 detik sudah terpasang tetapi belum terpicu di perangkat asli.
