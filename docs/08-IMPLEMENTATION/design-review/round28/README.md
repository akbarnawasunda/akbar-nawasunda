# Round 28 — the fold finally looks like a label, not a template

The owner's read after round 27 was correct in effect: the fixes had been surgical but invisible —
removals and under-the-hood work leave the same silhouette. Round 28 changes the silhouette:
composition, rhythm and material, not colour swaps or font sizes.

## What changed on screen

- **Hero recomposed.** The scrim stopped burying the photograph evenly: ink holds the left column
  where the name locks to the bottom-left baseline, and falls away to the right so the stage light
  breathes (`object-position 68% 40%`, one directional gradient + one floor fade). The facts row is
  no longer a hairline in the dark — it closes the first fold as a strip of the label's bone stock,
  the same paper the takeovers print on. The "Gulir" cue (a marker) is gone.
  Root cause of the floating strip found and fixed on the way: `.hero` used `min-height`, and flex
  children only grow into free space a container definitely has — with `min-height` the container
  stays content-high and the strip floated mid-screen with dead ink below.
- **Takeover as a pasted poster.** The featured sleeve tilts −1.5° on its ink plinth, the release
  title sets right against the left-set labels, and the AN mark ghosts behind the poster at 6% —
  artwork, portrait and monogram now share one identity on the same screen.
- **Night quote on paper.** The pull-quote left the photograph: it is a bone sheet laid over the
  frame, offset to the left edge. Type never sits on a photograph; paper can.
- **Index head carries its real count** ("10 rilis · sejak 2020", from the catalogue, right-set
  against the left title) instead of decorative numbering.
- **The water band breathes at 74svh** instead of 92, keeping the page's rhythm moving between the
  name and the poster.
- **/music featured sleeve** tilts +1.5° — one series, one hand.
- Mobile: hero stacks with the bone strip intact; the quote plate keeps gutter margins; the
  takeover title returns to the left.

## What did not change

Tokens, CSS Modules, the scroll engine, Lenis wheel-smoothing, the baked monogram and its
pointer-water, the studio photo pipeline, every gate contract. No new dependency, no new rAF loop,
no canvas/WebGL, no fabricated content: the count line and the facts strip read only catalogue and
`siteConfig` values.

## Verification

- typecheck 0 · lint 0 · tokens 91 · tests 132/132 · a11y 0 violations / 16 loads · qa:motion
  22/22 · review:shots 19/19 · check:web JS 189.5 KB gz / CSS 17.1 KB gz.
- Perf re-measured after the redesign (longtask + frame delta, standardized wheel scroll, CPU 4x):
  home 1440px 57 fps, 0 longtasks, worst frame 83 ms; home 390px dpr2 59 fps, 0 longtasks.
  The new paint cost is one static directional gradient and compositor-only `rotate`.
- Screenshots reviewed by eye at 1440 and 390 before commit: `d-home-hero`, `d-home-takeover`,
  `d-home-night`, `d-home-rail`, `d-music-featured`, `m-home-hero`, `m-home-night`.

## Incident note (process, not product)

One edit script this round sliced a CSS range with inverted indices and produced a 407k-line
`page.module.css` (replace of an empty string). Caught by `git diff --stat` before any gate ran;
the file was restored from HEAD and every edit re-applied with asserted anchors. No bad state was
ever built, served or committed.
