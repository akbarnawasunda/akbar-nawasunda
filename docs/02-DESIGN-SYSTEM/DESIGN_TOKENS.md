# DESIGN_TOKENS

```json
{
  "color": {
    "bg": {"base": "#0A0A0E", "surface": "#101012", "surface2": "#1A1A22", "surface3": "#242432"},
    "text": {"primary": "#FFFFFF", "secondary": "#A1A1B5", "muted": "#6B6B80"},
    "signal": {"blue": "#0087FF", "blueHover": "#1A93FF", "purple": "#7800FF", "icy": "#8AE8FF"},
    "border": {"default": "#2A2A3A", "strong": "#3A3A4A"},
    "focus": "#8AE8FF"
  },
  "font": {
    "display": "Instrument Serif, ui-serif, Georgia, serif",
    "body": "Inter, Satoshi, sans-serif",
    "mono": "JetBrains Mono, monospace"
  },
  "size": {
    "text": {"xs": "12px", "sm": "14px", "base": "16px", "lg": "18px", "xl": "20px", "2xl": "24px", "3xl": "32px", "4xl": "48px", "hero": "clamp(40px,8vw,96px)"},
    "spacing": {"0": "0", "1": "4px", "2": "8px", "3": "12px", "4": "16px", "6": "24px", "8": "32px", "12": "48px", "16": "64px", "24": "96px"}
  },
  "radius": {"sm": "8px", "md": "12px", "lg": "16px", "xl": "20px", "pill": "9999px"},
  "motion": {"fast": "150ms", "base": "250ms", "slow": "400ms", "ease": "cubic-bezier(0.4,0,0.2,1)", "easeOut": "cubic-bezier(0.16,1,0.08,1)"},
  "z": {"base": "0", "nav": "50", "overlay": "100", "modal": "200", "3d": "-1"}
}
```

## Usage MUST
- bg.base untuk body, bg.surface untuk cards
- signal.blue hanya untuk primary CTA, active states, 5px strip
- Never use signal colors untuk large backgrounds
- Focus ring: 2px solid focus + offset 2px
