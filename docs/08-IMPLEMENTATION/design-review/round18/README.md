# Round 18 — the five licensed faces land

Round 17 built the five-role map and ran it on stand-ins, because the licensed binaries were not in
the repository. The owner purchased them and said: use them, the licensing is on me. They were already
committed on `main` (the owner's own branch) — `Excess V Straight.woff2`, `Psychlone Straight.woff2`,
`Relidux.woff2`, `Impact Label SWL.woff2`, `Marseloup.woff2` — so this round copies them onto the
session branch from `origin/main` (read-only; `main` is never pushed to) and wires them in.

`npm run audit:fonts` now reports **5/5 roles on the target family**:

```
role      variable          target family        in use               weight   status
display   --font-display    Excess-V-Straight    Excess V Straight    400      target
heading   --font-heading    Psychlone-Straight   Psychlone Straight   400      target
body      --font-body       Relidux              Relidux              400      target
label     --font-label      Impact-Label-SWL     Impact Label SWL     400      target
accent    --font-accent     Marseloup            Marseloup            400      target
```

## What changed

- **`src/lib/fonts.ts`** — the five `src:` values now point at the licensed files. Every face is a
  *static, single-weight 400*, so every loader declares `weight: "400"`; declaring a range a static
  file does not have makes the browser synthesise the missing weights.
- **`src/styles/globals.css`** — `font-synthesis: none` on the root, and `h1,h2,h3` drop to
  `font-weight: 400`. Ten site stylesheets had seventeen `font-weight: 700` declarations left over
  from the variable-font era; all are 400 now. Hierarchy on this site is size, tracking and space —
  never a fake bold.
- **`src/styles/tokens.css`** — `--text-hero` re-fitted: `clamp(2.75rem, 12.5vw, 11.5rem)` →
  `clamp(1.9rem, 10.2vw, 10.5rem)`. Excess V Straight is roughly 25% wider than the Space Grotesk it
  replaced; measured in-browser, "NAWASUNDA" is 8.43 × font-size at the hero tracking, so 12.5vw broke
  the name into `AKBAR / NAWASUND / A`. 10.2vw keeps the longest word on one line from 320px to
  1920px. The footer wordmark follows at 10.2vw and now wraps at the space between the two names
  (`overflow-wrap: normal`) instead of mid-word; the loading curtain matches.
- **Subsetting** — all five binaries subset to the Latin ranges the site sets (basic Latin, Latin-1
  and general punctuation, arrows) and re-packed as WOFF2 with FontTools. Metrics and family names
  untouched. Marseloup stays the heaviest file on the site (~340 KB): it is a decorative outline face
  with dense contours, it has exactly one consumer (the below-the-fold quote), and it is the one slot
  with `preload: false`, so it never touches the critical path.
- **Removed** — the round 16 stand-in set (Space Grotesk, Instrument Sans/Serif, Inter, JetBrains
  Mono) and the unused `neo-latina-demo-FFP.woff2`, binaries and licence texts. Anton survives only
  for `scripts/generate-placeholder-covers.mjs`, which rasterises placeholder cover art and is never
  served as page type.
- **`src/assets/fonts/LICENSE-COMMERCIAL.txt`** — states plainly that the five faces are commercial
  fonts purchased by the site owner, that the licence papers are held off-repository, and that the
  files must not be copied into other projects.

Nothing in any component changed: no selector names a family, only a role, which is exactly why the
swap was five `src:` lines and a weight.

## Gates

```
typecheck ✓   lint ✓   audit:tokens 89 ✓   audit:fonts 5/5 target ✓
test 131/131 ✓   build ✓
a11y 0 violations / 16 loads ✓   qa:motion 22/22 ✓
check:web 196 KB gz JS (budget 250) · 16.9 KB gz CSS (budget 40)
review:shots 19 states ✓
```

## Screenshots

Per-route pairs, production build, curtain skipped:

- `*-hero.webp` — the first viewport exactly as a visitor sees it (fresh load, no scroll).
- `*.webp` — full page after a scroll walk for lazy media.

`type-specimen.png` — one line per role, rendered through the live `var(--font-*-stack)` tokens read
off `:root` in the running build, so the sheet shows the faces the site actually serves rather than a
typeset promise.

Known capture artefacts (not layout bugs): the sticky header appears twice in a full-page mobile
capture, and the 3D monogram band can render before its first frame under software Chromium.
