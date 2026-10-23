# 3D_ART_DIRECTION — Liquid Signal

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
