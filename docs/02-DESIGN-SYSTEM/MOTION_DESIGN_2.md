# MOTION_DESIGN — Final

- Easing: easeOutCubic [0.16,1,0.08,1] for entrances, easeInOut [0.4,0,0.2,1] for interactive
- Durations: 150ms hover, 250ms reveal, 400ms page transition, 6000ms 3D breathing
- Scroll reveal: fade + translateY 16px → 0, once, threshold 0.15
- 3D breathing: scale 1 → 1.03 loop 6s
- Never continuous rotation >5deg, no infinite parallax
- Reduced-motion: disable translate, scale, rotation — keep opacity only
