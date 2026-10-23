# COMPONENT_DESIGN — Detailed

## Nav
- Height 64px, sticky top, backdrop-blur 12px bg.base/80%, border bottom 1px border
- Left: AN mark transparent 32px + wordmark optional on desktop
- Right: links Music / Visuals / Artist / EPK (mono 12px uppercase), CTA Listen pill blue
- Mobile: hamburger → drawer full-screen black, focus trap

## Button
- Primary: pill, bg signal.blue, white text, 14px medium, px 20 py 10, hover signal.blue-bright, focus ring icy 2px
- Secondary: outline 1px border, transparent, white text
- Icon button: 40x40, center

## Release Card
- Aspect 1:1 cover, radius 16px, overflow hidden
- Image scale 1.0 → 1.05 on hover 250ms easeOut
- Overlay: gradient bottom 60% black/80%
- Title: Sora 18px, year mono 12px muted
- Platform icons appear on hover bottom-right
- Loading: shimmer bg.surface-2

## Hero
- Layout: 50% text left, 50% portrait right desktop; stacked mobile portrait top
- H1 tight -0.02em, sub mono, CTA primary + secondary (Spotify / YouTube)
- 3D Liquid Signal behind portrait: z-index -1, opacity 0.8, not overlapping text

## Section Header
- Label mono 11px tracking 0.2em uppercase secondary + blue line 24px
- Title display 32-48px
- Divider 1px border

## Footer
- Minimal 3 cols, blue 5px strip bottom (signal.blue)
- Left AN mark, center nav, right social, bottom domain + SINCE 2020
