# COLOR_SYSTEM — Final from Assets

## Analysis of Uploaded Assets
- Portrait: background near-black #0B0B12, rim light purple #9A6CFF + blue #2A5CFF, jacket #0E0E14 with AN silver #C8C8D0
- AN mark: black #08080A main, blue tip gradient #00A0FF → #0060FF, inner glow #0087FF, white stroke #FFFFFF 1px for legibility
- Full lockup: same + RMX blue #1E7FFF

## Semantic Tokens (final)
- bg.base: #0A0A0E (from portrait bg)
- bg.surface: #101014 (PVC matte)
- bg.surface-2: #1A1A22
- text.primary: #FFFFFF
- text.secondary: #A1A1B8 (from jacket silver)
- text.muted: #6A6A80
- border: #2A2A38
- signal.blue: #0087FF (primary CTA, from logo tip)
- signal.blue-bright: #1A93FF (hover)
- signal.purple: #7800FF (Potret Neon accent, not for text)
- signal.icy: #8AE8FF (focus, highlight)
- glow: rgba(0,135,255,0.32) for signal elements only

## Usage Rules
- Never use purple as body text on dark (contrast fail)
- Blue tip color only for interactive, not large bg
- White stroke on AN mark must stay for legibility on dark — do not remove
- Paint splatter texture from original JPG: do NOT use as bg, only reference for noise 2%
