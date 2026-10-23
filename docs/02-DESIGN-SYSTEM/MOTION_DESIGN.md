# MOTION_DESIGN

- Duration: fast 150ms for hover, base 250ms for reveal, slow 400ms for page transition
- Easing: easeOut for entrance, ease (0.4,0,0.2,1) for interactive
- Scroll reveal: fade + translateY 12px, once, threshold 0.2
- 3D: slow breathing, not constant spin
- Reduced-motion: @media (prefers-reduced-motion) → disable all transform >0, keep opacity only
- No infinite parallax, no endless particle.
