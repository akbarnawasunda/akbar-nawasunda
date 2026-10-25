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

## Current binaries (round 17 state)

The five target families are **not in the repository yet** — the folder still holds the previous set —
so each slot is filled by the closest available face and the build stays green:

| slot | file in use | stands in for |
| --- | --- | --- |
| display | `space-grotesk-latin-wght-normal.woff2` | Excess-V-Straight |
| heading | `instrument-sans-latin-wght.woff2` | Psychlone-Straight |
| body | `inter-latin-wght-normal.woff2` | Relidux |
| label | `anton-latin-400.woff2` | Impact-Label-SWL |
| accent | `instrument-serif-latin-400.woff2` (+ italic) | Marse-loup |

Deliberately different stand-ins per slot: with display and heading sharing one file, a reviewer
cannot see whether the role map works, and a mapping nobody can see is a mapping nobody maintains.

To finish the migration: drop the five licensed files into `src/assets/fonts/`, point the five `src:`
values in `src/lib/fonts.ts` at them (and fix `weight` where the face is single-weight), and delete the
stand-in files. Nothing else changes.

## Superseded

Round 16's Space Grotesk / Inter / JetBrains Mono trio, round 15's Space Grotesk display, round 13's
zine Anton + Instrument Sans + JetBrains Mono, and round 12's Syne are all historical. The complete
lineage is in `docs/08-IMPLEMENTATION/DECISION_LOG.md`.
