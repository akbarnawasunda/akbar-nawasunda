# Round 11 — the hero, re-set as a page

Art direction pass on the homepage hero only. No 3D architecture changed: `Plate3D`, `Depth`,
`AnMonogram` and the scroll engine are untouched; the commit changes one token, one stylesheet and
two numbers on the plate.

Files: `hero-1440-before.webp`, `hero-1440.webp`, `hero-390.webp`.

## What was measured before changing anything

At 1440×900, with the hero starting 73 px down the page:

| Symptom | Measurement |
| --- | --- |
| Name too dominant | 420 px of ink = 47% of the viewport, set at 204 px |
| Cramped above | 13 px between the blue rule and the ascenders of "Akbar" |
| **Cramped below** | the descenders of "Nawasunda." came within **−15,9 px** of the hairline over the paragraph |
| Mechanical | the three joints measured 64 / 62 / 31 px — even, so no hierarchy |
| Composition cut off | the scroll cue sat at y=914 on a 900 px screen: below the fold |
| Phone, dead air | 174 px of nothing above the masthead; the other four blocks packed into the last 350 px |

## What changed

- **`--text-hero` 14.2vw → 11.8vw**, cap 13rem → 9.75rem. Desktop 204 → 156 px; the name now takes
  36% of the viewport instead of 47%, and still fills the measure.
- **`space-between` → flex column with explicit margins.** The gaps are now decided rather than
  distributed: name 36–58 px (scales with the type), proof 49 px, facts 68 px, cue 23 px.
- **Optical, not typographic, margins.** Display type overhangs its line box by ~39 px at this size,
  so the name's margins are set against the ink: it clears the rule above by 25 px and the rule below
  by 49 px. The −15,9 px overlap is gone.
- **The fold is inside the hero**: `min-height: calc(100svh - var(--header-height))`, so the cue lands
  on screen. Growth is unaffected — it is a floor, not a cap.
- **Scrim rebuilt as three directional washes** (floor, ceiling, and a left-to-right wash from 640 px
  up). The photograph's only subject is a warm lamp on the right and all the type is on the left, so
  the protection is now directional: type on near-ink, lamp untouched. Verified on rendered pixels.
- **Plate rotation 6.2°/0.8° → 2°/0.5°**, shift 10 → 6 px. The range was described as
  motion-sickness-inducing; 2° still foreshortens the sheet as one plane, which is the cue that reads.

## Contrast, measured on the rendered backdrop

The scrimmed photograph was screenshotted with the type hidden, and the brightest pixel inside each
text run's own box was used as the backdrop — worst case, not average.

| Run | 1440 (mean / peak) | 390 (mean / peak) |
| --- | --- | --- |
| Akbar | 15,9 / 15,5 | 15,6 / 15,1 |
| Nawasunda. | 15,0 / 5,3 | 15,3 / 14,1 |
| Paragraph | 7,8 / 7,7 | 7,1 / 5,0 |
| Figures | 16,0 / 15,6 | 15,6 / 14,2 |
| Note | 7,7 / 7,4 | 7,6 / 7,1 |

Every run is AAA for large type and AA for small. The single 5,3 is the brightest highlight of the
lamp touching one descender of the italic line at 1440; the glyph body sits on ~19 grey.

Gates: `qa:motion` 22/22 · `a11y` 0 violations / 16 loads · `audit:tokens` 83 · tests 131/131 ·
`check:web` 191,5 KB gz JS / 17,9 KB gz CSS · `smoke` 28/28.
