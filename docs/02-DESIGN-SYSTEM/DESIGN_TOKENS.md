# DESIGN_TOKENS

The single source of truth is `src/styles/tokens.css`. This file is the summary a reviewer reads
before opening it; where the two disagree, the stylesheet wins.

Round 16 replaced the "neon grid" palette with a two-value one: **black and white**, with the neon
demoted from a page colour to the light inside the monogram and the focus ring.

```json
{
  "color": {
    "bg": {"base": "#000000", "surface": "#050505", "surface2": "#0B0B0B"},
    "field": "#000000",
    "text": {"primary": "#FFFFFF", "secondary": "#B8B8B8", "muted": "#8F8F8F"},
    "signal": {"blue": "#0087FF", "blueHover": "#38A7FF", "icy": "#7FC4FF"},
    "hairline": {"default": "rgb(255 255 255 / 0.16)", "strong": "rgb(255 255 255 / 0.5)"},
    "border": {"default": "#1F1F1F", "strong": "#4A4A4A"},
    "stamp": {"default": "#FF3B30", "ink": "#FF6B62"}
  },
  "font": {
    "display": "Excess-V-Straight (h1 hero name only — round 19)",
    "body": "Relidux (everything else: h2/h3, titles, paragraphs, buttons, nav, meta)"
  },
  "metric": {
    "leading": {"hero": "0.86", "tight": "1.02", "title": "1.12", "body": "1.6"},
    "tracking": {"hero": "-0.045em", "tight": "-0.02em", "title": "0.04em", "label": "0.2em", "nav": "0.13em"}
  },
  "size": {
    "text": {
      "hero": "clamp(1.9rem, 10.2vw, 10.5rem)",
      "display": "clamp(2rem, 6.2vw, 5rem)",
      "title": "clamp(1.35rem, 2.2vw, 1.9rem)",
      "body": "clamp(1rem, 0.96rem + 0.2vw, 1.0625rem)",
      "small": "0.875rem"
    },
    "spacing": {"1": "4px", "2": "8px", "3": "12px", "4": "16px", "6": "24px", "8": "32px", "12": "48px", "16": "64px", "24": "96px", "32": "128px"},
    "container": "1440px",
    "gutter": "clamp(1.25rem, 3vw, 3rem)",
    "sectionPadding": "clamp(3.5rem, 7vw, 7rem)"
  },
  "radius": {"sm": "0", "xl": "0", "2xl": "0", "pill": "9999px (the Studio's status dot only)"},
  "motion": {"fast": "150ms", "base": "250ms", "slow": "400ms", "ease": "cubic-bezier(0.4,0,0.2,1)", "easeOut": "cubic-bezier(0.16,1,0.08,1)"},
  "z": {"effects": "0", "content": "10", "chrome": "50", "overlay": "100"}
}
```

## Rules that come with these values

1. **Type is the design, and two faces are the type.** The display face sets the hero name and
   nothing else; Relidux sets every other glyph (round 19). A page states its name in uppercase at
   `--text-hero`; nothing else on the band is allowed to be large; the copy under it is 1rem at
   `--leading-body` in `--color-text-secondary`, and the controls are 0.6875rem body type at
   `--tracking-nav`. No component names a family — only a role token (`--font-display-stack` /
   `--font-body-stack`), and `npm run audit:fonts` fails the build if a third face ever returns.
2. **No fill except white.** Panels are the ground plus a hairline. The only filled objects on the
   site are the primary button, the hovered index row, and a hovered social cell — all white.
3. **The accent is not paint.** `#0087FF` appears as: the full stop after the hero name, the "AN" in
   the monogram heading, the monogram's own bloom, and the focus ring. Nowhere else.
4. **No radius.** Every panel, button, input and frame is a right angle. The one pill left is the
   Studio's status dot.
5. **Photography is monochrome, high contrast.** `grayscale(1) contrast(1.18) brightness(0.92)` on
   every photograph; sleeve artwork one step lighter so its own type stays legible.
6. **`[NEEDS OWNER]` is not printed.** Missing facts are an em dash or absent. The Studio still
   tracks them; the public page does not annotate itself.

## Superseded

Round 15's `#050507` ground, blue hairline (`rgb(0 135 255 / 0.18)`), 1240px container, 0.96 leading
and duotone photography are all gone. Round 13's zine (Anton, red/cyan misregistration, paper stock)
was rejected by the owner before that.
