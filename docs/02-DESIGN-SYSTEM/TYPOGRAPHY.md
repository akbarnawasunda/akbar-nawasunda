# TYPOGRAPHY

Five roles, five self-hosted families through `next/font/local` (`src/lib/fonts.ts`, files in
`src/assets/fonts/`, OFL licences beside them). Nothing is fetched from a third-party host at runtime
and nothing is installed from npm at build time.

| role token | family (target) | where it is used |
| --- | --- | --- |
| `--font-display` | **Excess-V-Straight** | H1 only: the hero name, the footer wordmark, the loading curtain, the 404 |
| `--font-heading` | **Psychlone-Straight** | H2 and every section title — MUSIK, ARSIP, PRESS KIT, INDERS, "Tanda AN", stat values |
| `--font-body` | **Relidux** | body copy, navigation, buttons, every small label and meta line, `01 — Katalog` |
| `--font-label` | **Impact-Label-SWL** | release and track titles (Ticker, Indeks, katalog wall, sleeve, release page), the play/listen row |
| `--font-accent` | **Marse-loup** | quotes and decorative lines (the night-frame pull quote) |

## The rule that makes this rotation cheap

No component names a family. Every rule asks for a role — `font-family: var(--font-label-stack)` —
and the five stacks are declared once in `tokens.css`:

```css
--font-display-stack: var(--font-display), "Excess V Straight", sans-serif;
--font-heading-stack: var(--font-heading), "Psychlone Straight", sans-serif;
--font-body-stack:    var(--font-body),    "Relidux",            sans-serif;
--font-label-stack:   var(--font-label),   "Impact Label", "Arial Narrow", sans-serif;
--font-accent-stack:  var(--font-accent),  "Marse Loup",         serif;
```

Swapping a face is therefore a one-line edit in `src/lib/fonts.ts`. The stack still names the *intended*
family after the `next/font` variable, because `var(--font-*)` already carries next/font's generated
fallback chain (`fontFamily, ui-sans-serif, system-ui, …`) and repeating that chain in the token is
noise in every `computedStyle` read-out.

## Small type is body type, opened up

The mono face is gone. Anything under 15px — navigation, counters, `01 — Katalog`, footer rules,
button labels — is set in `--font-body` with letter-spacing, in three steps:

| token | value | size it is for |
| --- | --- | --- |
| `--tracking-label` | 0.2em | 9–10px uppercase meta, counters |
| `--tracking-nav` | 0.13em | 11–14px navigation, buttons, list meta, inline `code` |
| `--tracking-stamp` | 0.015em | the label face at title size — tape is tight, not airy |

The reason is optical, not stylistic: a text face at 9px with default tracking closes its counters and
turns into a grey line. Opening it to 0.2em restores the letter shapes at the cost of width nobody is
short of in a meta line.

## The label face is a stamp, not a headline

`--font-label` is single-weight by design. Every block that uses it therefore:

- sets `font-weight: 400` (the browser would otherwise synthesise a bold — `font-synthesis: none` in
  `globals.css` turns that off rather than letting it happen),
- uses `--tracking-stamp` instead of the display tracking, which was tuned for a geometric sans,
- uses `--leading-stamp` (0.94) instead of `--leading-hero`, because a condensed face at 0.86 lets its
  ascenders touch the line above.

## Current system (round 19 state — two faces, strict hierarchy)

The owner's correction after seeing rounds 17–18 on screen: five families in one viewport read as a
ransom note. The site now ships **two**:

| role | family | where it may appear |
| --- | --- | --- |
| `--font-display` | Excess V Straight | the hero H1 — the giant "AKBAR NAWASUNDA". Nowhere else. |
| `--font-body` | Relidux | everything else: H2/H3, page names, release and track titles, paragraphs, buttons, navigation, meta labels, the footer wordmark, the loading curtain. |

Psychlone Straight, Impact Label SWL and Marseloup remain purchased files in `src/assets/fonts/`
(documented in `LICENSE-COMMERCIAL.txt`) but nothing loads them. `npm run audit:fonts` exits non-zero
if any stylesheet, component or loader reaches for them again — the contract is enforced, not asked
for. The label face's white tape box disappeared with the face: it was drawn inside the glyphs.

Both binaries are static 400 faces, so every weight declaration on the site is 400 and
`font-synthesis: none` forbids a fake bold. Hierarchy is size, tracking, case and colour:

| treatment | use |
| --- | --- |
| `--text-hero` (10.2vw) + `--tracking-hero` + `--leading-hero` | the hero name only |
| `--text-display` / masthead sizes + `--tracking-tight` + `--leading-tight` | page and section names |
| uppercase + `--tracking-title` (0.04em) + `--leading-title` (1.12) | release and track titles — plain Relidux text, no box |
| `--leading-body` (1.6) + `--color-text-secondary` | every paragraph: grey ink, not glaring white |
| uppercase + `--tracking-label` (0.2em) / `--tracking-nav` (0.13em) | meta labels, nav, buttons |

Placeholder sleeves carry **no type at all** since round 19 (`scripts/generate-placeholder-covers.mjs`):
a rasterised title in a face the page does not ship is the same ransom note, and raster type cannot
reflow, be selected or be translated. Every title on the site is HTML text.

Layout notes that keep it clean on phones: the catalogue wall is one column below 560px (two columns
of Relidux caps leave a 130px title column at 390px, which cannot fit "MENCINTAINYA" at any legible
size), and wall titles carry `overflow-wrap: break-word` as a last resort only.

## Superseded

Round 16's Space Grotesk / Inter / JetBrains Mono trio, round 15's Space Grotesk display, round 13's
zine Anton + Instrument Sans + JetBrains Mono, and round 12's Syne are all historical. The complete
lineage is in `docs/08-IMPLEMENTATION/DECISION_LOG.md`.
