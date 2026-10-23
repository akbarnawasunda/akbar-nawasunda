# PERFORMANCE_BUDGET — v2

- JS initial public <180kb gz
- 3D chunk <70kb gz extra dynamic
- CSS <30kb
- Portrait LCP WebP <150kb (current jpg 1346KB too big — must compress to 1200px WebP ~140KB)
- AN mark transparent <50KB
- LCP <2.5s Moto G4, CLS <0.1, INP <200ms
- 3D init <1.2s, FPS >45 mid, if <30 for 2s auto fallback
- Image optimization: next/image sizes, lazy except LCP
- Font self-host, swap

Measurement steps documented in TESTING.
