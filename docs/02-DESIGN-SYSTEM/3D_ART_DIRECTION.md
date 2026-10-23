# 3D_ART_DIRECTION — Liquid Signal

> **WITHDRAWN (2026-10-23).** The owner removed the Liquid Signal from the site: the hero, the
> catalogue and the 404 now carry no 3D, no canvas, no particle field (D-055). The Phase 7 WebGL
> implementation this document describes was deleted, not disabled. This file stays as the record of
> how the effect was specified, in case it is ever revisited — it is **not** a description of the
> current site. The current visual language is in `DESIGN.md`: real photography, tight display type,
> 11px mono labels, hairlines, one 2% grain layer.

## Concept Meaning
Liquid Signal = visualisasi sinyal bass yang cair, metalik, mengalir. Representasi transisi: dari remix culture yang cair, tidak berbentuk (DJ Akbar Remix) → identitas yang solid tapi tetap fluid (Akbar Nawasunda). Menggabungkan elemen air (Sunda: flow, sungai) + metal (modern bass, studio gear).

Bukan bola bercahaya generik.

## Subject
- Single sculptural blob / liquid metal form, bukan banyak objek.
- Material: dark metallic base (#101012) dengan highlight biru #0087FF di edge + icy specular. Low roughness (0.2), metalness 0.8, subtle iridescence.
- Geometry: metaballs / SDF blob yang morphing slow, bukan random particle.

## States
1. **Hero idle:** blob di belakang portrait, slow breathing scale 1 → 1.03 over 6s, rotation Y 0→5deg
2. **Scroll:** morph shape slightly, camera dolly -10% (parallax depth, bukan blocking)
3. **Hover music card:** small ripple di blob (signal response)
4. **Low-power:** freeze to static image (pre-rendered WebP)
5. **Reduced-motion:** static image only
6. **Fallback:** CSS gradient + Potret Neon image, no WebGL

## Interaction
- Desktop: pointer moves light position slightly (max 10deg), not geometry
- Mobile: touch disabled for 3D, only scroll morph
- Never auto-rotate fast, never glitch effect

## Technical Spec
- Framework evaluation: Prefer Three.js + R3F if repo Next.js, else Canvas 2D SDF untuk bundle kecil. Decision must be logged.
- Single scene, evolving, not multiple scenes. Dispose on unmount.
- Performance: <80k triangles, 1 light + 1 HDRI low-res, texture <512px
- Loading: placeholder blurred image, init after LCP. If WebGL not supported → fallback.
- Memory: cleanup renderer, geometry, material on route change. Test GPU memory via Chrome perf.

## Performance Budget 3D
- Init <1.2s on mid Android
- JS extra for 3D <70kb gzipped (if Three)
- FPS >45 on Snapdragon 680 equivalent
- If FPS <30 for 2s → auto fallback to static

## Acceptance
- [ ] Meaning documented, not generic
- [ ] Single scene file / component
- [ ] Fallback works with JS disabled? At least readable
- [ ] No blocking text, no preventing click
- [ ] Reduced-motion media query respected

---

## Implementasi Phase 7 (2026-10-23)

Rekomendasi "Prefer Three.js + R3F" **tidak** dipakai. Alasannya angka: `three@0.186` mengirim
127 KB gz + 279 KB gz inti sebelum tree-shaking, sedangkan budget chunk 3D adalah < 70 KB gz, dan
yang dibutuhkan di sini hanya satu point cloud tanpa lighting, loader, atau post-processing. Yang
dibangun adalah renderer WebGL tulis tangan (±3,1 KB gz) — detail keputusan di D-050…D-054.

| Butir spec | Status Phase 7 |
|---|---|
| Satu scene / satu komponen | `liquid-signal/` + `HeroSignal`; hanya dipakai di hero beranda |
| Bukan bola bercahaya generik | Field titik dengan tepi menyala (rim) dan interior redup; bagian dalam tidak pernah menutup jadi bola |
| Dot 1.5–3 px, palet #0087FF → #8AE8FF → #7800FF | Ya: titik 2–9 px menurut kedalaman/rim di buffer device px, warna dari tinggi + rim, latar #0A0A0E |
| Breathing 1 → 1.03 / 6 s, rotasi Y 5° / 20 s | Ya (`breathScale`, `signalViewMatrix`) |
| Reduced-motion → statis | Ya, renderer tidak pernah diimpor |
| Fallback tanpa WebGL | Ya: SVG server-rendered adalah lapisan dasar, bukan placeholder |
| FPS < 30 selama 2 s → statis | Ya, governor di renderer (lihat D-053) |
| Dispose saat unmount | Ya: buffer, program, context (`WEBGL_lose_context`) |
| Init setelah LCP | Ya: `load` → `requestIdleCallback` (timeout 1.2 s) |
| Tilt pointer ≤ 10° / parallax −10% | **Belum** — ditunda ke Phase 8, lihat §17 di audit |
