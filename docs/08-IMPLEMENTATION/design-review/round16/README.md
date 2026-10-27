# Round 16 — "HUD" (Swiss-Tech / High-End EDM)

The owner supplied twenty screenshots of a world-class artist site (desktop + mobile, full page, for
home, music, contact, privacy and terms) and named it the absolute reference. Six instructions:

1. **Typography.** Drop Anton/Zine entirely. A geometric sans, bold and clean, headlines at
   10–15vw, uppercase, leading 0.9, set over photographs or black.
2. **Layout and grid.** `#000000` ground, `#FFFFFF` ink, no teal/zine boxes, thin `+` / `×` marks in
   the corners, symmetric and precise.
3. **Copy.** Delete every meta sentence ("dihitung dari katalog", "sengaja tidak ada formulir") and
   **every `[NEEDS OWNER]` tag**. Short, to the point.
4. **3D.** Do not break the neon monogram. It becomes the centrepiece of the homepage.
5. **Photography.** High-contrast grayscale, or dramatically natural colour. No teal frames.
6. **Mobile.** The giant type must not overflow or fall apart on a phone.

## What the screenshots in this folder are

| file | what it is |
| --- | --- |
| `home-desktop.webp`, `home-mobile.webp` | the full homepage, 1440 and 390 |
| `music-…`, `visuals-…`, `artist-…`, `epk-…`, `contact-…` | the five inner pages, both widths |
| `monogram-desktop.webp` | the 3D band on its own, after the shader has compiled |
| `monogram-mobile.webp` | the same band at 390, where the renderer deliberately does not mount |
| `home-mobile-menu.webp` | the full-screen menu, open |

Captured from a production build (`next start`) at `1440×900` and `390×844`, full page, curtain
skipped, with a scroll walk first so every lazy image and reveal is in its final state.

Two honest notes about the capture environment:

- The monogram band screenshots are taken as **element** shots after waiting for
  `[class*="canvas"][data-ready="true"]`. A full-page screenshot of the homepage cannot show the 3D:
  the scene is 30 fps only while it is on screen, and a full-page capture in software Chromium
  renders it before the first frame lands.
- The featured sleeve on the homepage also looks darker in these sheets than it does live. It sits
  inside a `perspective` plate, and a full-page capture in software Chromium flattens that layer at
  reduced luminance. An element shot of `[data-sleeve]` shows the truth: the real cover's white
  title on its ink ground, fully legible. The cover art itself is near-black by design (it is the
  artist's own sleeve), so it *is* a dark object on a black page — that is the sleeve, not a bug.
- Below 768px the WebGL renderer never mounts (round 14 rule: no canvas below 768px), so the phone
  shows the **static mark** in the band instead of an empty 74svh of black. That is the mobile
  centrepiece, and it is visible in `monogram-mobile.webp`.

## What changed, file by file

- **`tokens.css`** — black/white palette, hairline in white not blue, 1440px container, radius 0,
  `--text-hero` at `clamp(2.75rem, 12.5vw, 11.5rem)`, leading 0.86.
- **`globals.css`** — h1/h2/h3 are uppercase Space Grotesk 700 at 0.86 leading; photography is
  `grayscale(1) contrast(1.18)`; `.ink` is now a white/blue bloom instead of a misregistered plate.
- **`layout/HudMarks.tsx`** (new) — the `+`/`×` marks: a ruled strip for section seams and four
  corner marks for full-bleed bands. Text glyphs, `aria-hidden`, no assets.
- **`SiteHeader`** — one `MENU` control at every width (the reference does the same at 1440), the
  four text links moved into the full-screen index, solid black bar, no underline nav.
- **`SiteFooter`** — Follow row of bordered cells, four columns, the email as a full-width bar, and
  the name at 11.5vw. No `[NEEDS OWNER]` rows.
- **`ButtonLink`** — right-angled white / outlined boxes, mono uppercase labels.
- **`page.module.css` + `page.tsx`** — hero at 12.5vw with the facts on a rule, the monogram band
  immediately under it, the newest release, the ruled index (inverts to **white**, not blue), the
  night frame, the archive, the press sheet, the press kit.
- **`VisualRail`** — was a 300vh pinned horizontal rail; it is now a 3-column monochrome wall. The
  pin produced two full screens of black between the last panel and the next section, and the
  reference is a wall.
- **`/music`, `/visuals`, `/artist`, `/epk`, `/contact`** — mastheads at hero size, hairlines, no
  coloured plates, no stamps, no footnotes explaining the page.
- **`BackSide`** — "Balik lembar" became "Indeks"; its accent fills became white rules.
- **`ReleaseCover.module.css`** — sleeves were being graded as photographs. The intended "sleeve art
  is typography, one step lighter" filter was written as `.cover img` in `globals.css`, where `.cover`
  is a *CSS-module* class and therefore never matched; it had been dead code since round 13. It now
  lives in the module as `.cover.cover > img`, verified on the live page.
- **`qa-motion.mjs`** — the canvas check now measures a fresh tab at scroll 0 and compares against
  where the band actually is. The old assertion ("zero canvases after scrolling halfway down") was
  written when the monogram sat 4,400px down; round 16 moved it directly under the hero, so a
  mounted canvas there is the correct outcome, not a regression.

## Gates at this commit

```
audit:tokens  84 tokens · no raw hex outside tokens.css · no orphaned tokens
typecheck     ✓
lint          ✓
test          131/131
a11y          0 violations / 16 page loads
qa:motion     22/22
smoke         28/28
check:web     196 KB JS gz (budget 250) · 16.6 KB CSS gz (budget 40)
review:shots  14 sheets (round15 set, re-shot against the new design)
```
