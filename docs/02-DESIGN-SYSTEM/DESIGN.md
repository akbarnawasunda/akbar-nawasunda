# DESIGN.md — Master Design Spec

## Concept: Editorial Signal
Bukan landing startup. Ini majalah musik dark editorial dengan satu objek 3D yang hidup.

Referensi yang dikasih owner: tall editorial composition, dramatic cinematic imagery, strong contrast dark vs luminous blue, layered depth. Interpretasi untuk Akbar: jangan clone layout, ambil prinsipnya.

## Visual System
- Background: #0A0A0E (near-black) base, #101012 matte PVC untuk cards, #1A1A22 charcoal surface
- Signal: Blue #0087FF untuk primary action + line, Purple #7800FF untuk accent Potret Neon, Icy #8AE8FF untuk highlight text
- Typography:
  - Display: Syne / Sora / General Sans, 700-800, tight -0.02em, uppercase occasional
  - Body: Inter 400-500, line-height 1.6
  - Fluid: clamp(16px, 1.2vw, 18px) body, clamp(32px, 6vw, 96px) hero
- Spacing: 4px base, scale 8,16,24,32,48,64,96,128,192
- Grid: 12 col desktop, max-width 1280px, gutter 24px, margin 24-64
- Radius: cards 16-20px, buttons 9999 (pill) or 12px, never random
- Shadows: soft diffuse, not neon glow. Only signal elements get subtle outer glow 0 0 24px rgba(0,135,255,0.3)

## Homepage Narrative (v1 proposal, boleh reorder)
1. Nav minimal: AN logo kiri, Music / Visuals / Artist / Studio kanan, CTA Listen
2. Hero: 70vh, kiri text "AKBAR NAWASUNDA" tight, kanan Potret Neon + 3D Liquid Signal blob di belakang sebagai depth, bukan overlap text. Primary CTA "Dengar Sekarang" → latest release.
3. Editorial index: compact nav / signal line
4. Music section: grid 3 col, cards dengan cover 1:1, hover reveal platform icons
5. Featured release: large 16:9 artwork + story + listen links
6. Identity / process: teks + material close-up
7. Visual archive preview: 2x2 Potret Neon
8. Closing: strong statement + blue strip 5px
9. Footer: minimal, domain, Bandung Barat • Since 2020, social

## Anti-Generic Rules
- Setiap section harus beda komposisi: jangan semua centered + oversized heading
- Jangan giant glowing sphere tanpa makna. Objek 3D harus Liquid Signal yang berevolusi.
- Animasi: prefer intentional, bukan continuous. Scroll-driven subtle.

## Mobile
- Hero 100vh stacked: foto full width, text di bawah, 3D jadi static image atau simplified canvas.
- No horizontal scroll, no endless parallax.
