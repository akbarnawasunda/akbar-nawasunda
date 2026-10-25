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

## Current binaries (round 18 state — the purchased faces)

All five target families are now in the repository, self-hosted, subset to the Latin ranges the site
sets. `npm run audit:fonts` prints this table from `src/lib/fonts.ts` and fails loudly if a slot ever
points somewhere else:

| slot | file in use | family | weight |
| --- | --- | --- | --- |
| display | `Excess V Straight.woff2` | Excess V Straight | 400 (static) |
| heading | `Psychlone Straight.woff2` | Psychlone Straight | 400 (static) |
| body | `Relidux.woff2` | Relidux | 400 (static) |
| label | `Impact Label SWL.woff2` | Impact Label SWL | 400 (static) |
| accent | `Marseloup.woff2` | Marseloup | 400 (static) |

Two consequences of "every face is a static 400", both enforced in code:

1. Every loader declares `weight: "400"` — declaring a range a static file does not have makes the
   browser synthesise the missing weights.
2. `font-synthesis: none` in `globals.css`, and no stylesheet on the site asks for a weight other
   than 400. Hierarchy is carried by size, tracking and space, never by bold.

Sizing was re-fitted for the new display face: Excess V Straight is roughly 25% wider than the Space
Grotesk it replaced, so `--text-hero` moved from `clamp(2.75rem, 12.5vw, 11.5rem)` to
`clamp(1.9rem, 10.2vw, 10.5rem)` (measured: "NAWASUNDA" = 8.43 × font-size at the hero tracking), and
the footer wordmark and loading curtain follow at 10.2vw. The footer wordmark also wraps at the
space between the two names now (`overflow-wrap: normal`), never inside a word.

Licences: the five are commercial faces purchased by the site owner; see
`src/assets/fonts/LICENSE-COMMERCIAL.txt`. The previous open-licensed set was removed except Anton,
which survives only inside `scripts/generate-placeholder-covers.mjs` for rasterising placeholder
cover art and is never served as page type.

## Superseded

Round 16's Space Grotesk / Inter / JetBrains Mono trio, round 15's Space Grotesk display, round 13's
zine Anton + Instrument Sans + JetBrains Mono, and round 12's Syne are all historical. The complete
lineage is in `docs/08-IMPLEMENTATION/DECISION_LOG.md`.
