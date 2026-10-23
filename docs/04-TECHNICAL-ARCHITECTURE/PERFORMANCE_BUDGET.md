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
