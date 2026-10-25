# DESIGN_TOKENS

The single source of truth is `src/styles/tokens.css`. This file is the summary a reviewer reads
before opening it; where the two disagree, the stylesheet wins.

```json
{
  "color": {
    "bg": {"base": "#050507", "surface": "#0A0A12"},
    "field": "#070710",
    "text": {"primary": "#FFFFFF", "secondary": "#A8B0C2", "muted": "#8A93A6"},
    "signal": {"blue": "#0087FF", "blueHover": "#38A7FF", "icy": "#7FC4FF"},
    "hairline": {"default": "rgb(0 135 255 / 0.18)", "strong": "rgb(0 135 255 / 0.52)"},
    "border": {"default": "#141824", "strong": "#242B3A"},
    "stamp": {"default": "#FF3B30", "ink": "#FF6B62"}
  },
  "font": {
    "display": "Space Grotesk (variable 300–700)",
    "body": "Inter (variable 100–900)",
    "mono": "JetBrains Mono (labels, counters, every number)"
  },
  "metric": {
    "leading": {"hero": "0.96", "tight": "1.1", "body": "1.65"},
    "tracking": {"hero": "-0.03em", "tight": "-0.02em", "label": "0.18em"}
  },
  "size": {
    "text": {
      "hero": "clamp(2.75rem, 7.2vw, 6.5rem)",
      "display": "clamp(1.75rem, 3.6vw, 3rem)",
      "title": "clamp(1.5rem, 2.6vw, 2.25rem)",
      "body": "clamp(1rem, 0.96rem + 0.2vw, 1.0625rem)",
      "small": "0.875rem"
    },
    "spacing": {"0": "0", "1": "4px", "2": "8px", "3": "12px", "4": "16px", "6": "24px", "8": "32px", "12": "48px", "16": "64px", "24": "96px", "32": "128px", "40": "160px"},
    "container": "1240px",
    "gutter": "clamp(1.25rem, 5vw, 4rem)"
  },
  "radius": {"sm": "2px", "xl": "4px", "2xl": "4px", "pill": "9999px (dots and the live light only)"},
  "motion": {"fast": "150ms", "base": "250ms", "slow": "400ms", "ease": "cubic-bezier(0.4,0,0.2,1)", "easeOut": "cubic-bezier(0.16,1,0.08,1)"},
  "z": {"effects": "0", "content": "10", "chrome": "50", "overlay": "100", "modal": "200"}
}
```

## Round 15 — the accent is a light, not a surface

The round-13/14 rule ("`#0087FF` belongs to the monogram band and nowhere else") is superseded. The
owner's round-15 brief asks for one accent applied consistently across buttons, rules and hovers, and
that is now what the system does — with one hard constraint that survives from round 14:

- **Never a large field of the accent.** No full-bleed `#0087FF` bands, no accent page heads, no accent
  panels. The accent appears as type, as a 1 px rule, as a 2 px closing line, as a focus ring, as a
  fill on the primary action, and as bloom on the 3D object. If a surface would be larger than a
  button, it is `--color-bg-base` or `--color-bg-surface`.
- **Hairlines are the structure.** Sections are separated by `--color-border`; the seam under the hero
  and the frame around an object use `--color-hairline` / `-strong`.
- **One photonic treatment, every photograph.** `grayscale → sepia → hue-rotate(178deg) → saturate`,
  plus a 3 px `repeating-linear-gradient` screen. Implemented as `filter` + an overlay pseudo-element
  because `mix-blend-mode` and `filter: blur(` are banned by `tests/fixtures/anti-ai.ts`.
- **Radii stay at 2–4 px.** A pill is reserved for the live dot.

## Usage MUST

- `bg.base` for the page, `bg.surface` for a panel that needs to sit above it.
- `signal.blue` for the primary action, the active nav underline, hover text, focus, and the small
  live dot. Never for a surface larger than a control.
- Text on `signal.blue` is `--color-on-brand` (`#050507`, 5.7:1). White on the accent is 3.4:1 and is
  a defect.
- `text.muted` is the lightest grey allowed at label sizes; it measures 6.6:1 on `bg.base`. A token
  that fails 4.5:1 at 9 px is not a "quiet" tone, it is an unreadable one.
- Focus ring: 2 px solid `signal.blue`, 3 px offset.
- Numbers are mono and tabular; prose is Inter; anything above 24 px is Space Grotesk.
