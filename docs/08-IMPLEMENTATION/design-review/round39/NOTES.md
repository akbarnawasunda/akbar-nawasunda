# Round 39 — standardisation

The owner's final directive: no new concepts, no bracket markers, just make it tidy, expensive-looking
and functional. Six items, recorded as defect → cause → change → proof.

Screenshots: `public/review-shots/` at 390px and 1440px, produced by `.github/workflows/review-shots.yml`
on commit `735ef00`. Round 39 added two: `menu-390.png` and `menu-1440.png` — the drawer photographed
**open**, because "the close button is invisible" is a claim about a state and a shot of the closed page
cannot answer it.

## 1. The mark moves on its own

**Defect.** The liquid was technically animated and visibly frozen.

**Cause.** `liquidHeight()` advanced its noise field at `uTime * 0.10` and `uTime * 0.17` against a clock
that counts real seconds — the surface needed about a minute to change shape.

**Change.** `uTime * 0.8` (and `1.35` for the second octave, `0.62` for the UV flow). The lobes travel at
a walking pace; no pointer, no hover, no scroll is involved. The shader's own `useFrame` clock is the
only driver.

## 2. One mark, not two

**Defect.** A dark silhouette behind the logo — the baked still showing through the shader.

**Change.** `AnMonogram.tsx` no longer keeps the WebP in the DOM under the canvas. It is *unmounted* the
moment the shader reports its second painted frame and comes back only if the GPU drops the context. The
still is now exactly what it should have been all along: the fallback for a reader without WebGL or with
reduced motion — asserted on that page by `qa-motion` (`without motion the band is the baked still,
decoded, and no canvas`), while the live page asserts the opposite (`painted && !still`).

## 3. One display face, and it is the name

**Defect.** Every heading on the site looked like the logo.

**Cause.** Two of them. `globals.css` put the display stack on the **h1 element**, so /contact, /epk,
/artist and the 404 were all set in Excess V Straight; and the release title, the ledger, the section
headings and the tour titles each asked for it by hand.

**Change.**
- `h1` is reading type now; `.heroName` is the single rule in the codebase that names the display stack
  (`grep -rn font-display-stack src --include=*.css` returns exactly one line).
- Spotlight title: body face, `clamp(1.5rem, 2.2vw, 1.85rem)`, `line-height: 1.28`.
- Ledger rows: body face, `clamp(1rem, 1.35vw, 1.1rem)`, weight 500, `1.35` leading.
- Section headings, tour titles and the catalogue's featured title follow the same two steps.
- `--text-takeover` is deleted with its last consumer — `audit:tokens` fails on an orphan, which is what
  caught it.
- Drawer index: `clamp(1.5rem, 3.4vw, 2.25rem)` instead of up to 4rem, with roomier rows.

## 4. No title inside the cover box

The homepage's fallback sleeve is now `#14263A` and the AN mark, centred and printed white — nothing
else. The track name was already set at full size three inches to the right; printing it twice inside one
screen was the duplication.

## 5. The close button

This took four passes, and each pass was found by the open-menu screenshot, not by reading the CSS:

1. **The control was outside the dialog.** The only closer was the sticky bar's MENU/TUTUP button — not
   in the drawer's focus trap, so Tab could never reach it. A real close button now lives *inside* the
   dialogue: `position: fixed; top: 0; z-index: 1000`, first focusable element, `aria`-named "Tutup menu".
2. **It was painted underneath the bar.** A fixed child can never paint above its own stacking context,
   and the dialog sat at `--z-chrome` while the open bar sat at `--z-chrome + 1`: present, focusable,
   invisible. The dialog is `+ 2` now.
3. **Escape dropped focus at the top of the page.** The handler called `.focus()` on the bar's toggle
   while that toggle was still `visibility: hidden` from the open state; the call ran before React had
   re-rendered it back into view and silently did nothing. A pending flag plus an effect returns focus on
   the first press — `qa-motion` now asserts `focusOnToggle: true`.
4. **The X rendered as "<".** The button is under the cursor the instant the menu opens, and the shared
   hover rule pivots a burger's two lines around their left ends. The drawer's X is two absolutely
   positioned bars in a fixed 18×12 box, rotated about their own centres, with no hover transform.

With the dialog open the bar holds the brand and the way out only: the bar's own toggle steps aside
(`visibility`, so nothing slides under the X) and Listen hides too — it sat immediately beside the close
control, and the drawer carries its own Listen call to action.

## 6. Empty boxes in the visual wall

Confirmed from the round-38 fix and re-checked here: `VisualRail` and `VisualGrid` drop any item without
a `src`, and the capture harness forces deferred images rather than scrolling them. All six tiles paint in
`home-1440-full.png`.

## Air

`--section-padding` is `clamp(7rem, 9vw, 9.5rem)` (was 6–8rem), ledger rows are `var(--space-6)` tall, and
the drawer's rows are one step roomier.

## Gates

`typecheck` · `lint` · `audit:tokens` (119 tokens, no raw hex in CSS modules, no orphans) · `npm test`
147/147 · `npm run build` · `check:web` (JS 189.4 KB gz, CSS 15.6 KB gz, every link resolves) · CI on
`735ef00`: a11y 0 violations across 15 loads (including the open drawer), smoke 28/28, qa:motion 22/22.

## Commits

`31eada6` the round itself · `33506b3` Escape focus + the qa contract · `c64021f` dialog stacking context ·
`ba91c65` the fallback assertion on the reduced-motion page · `901a1d3` the bar's Listen steps aside ·
`222dc9b` the X that stays an X · `735ef00` the display face belongs to one line of type.
