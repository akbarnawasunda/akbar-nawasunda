# Round 6 — review set

Sixteen states, captured with Playwright against the production build:

```bash
npm run build && npm run start          # in one shell
npm run review:shots                    # in another; writes this folder
```

`scripts/review/shots.mjs` holds the shot list; `scripts/qa-motion.mjs` holds the assertions
(14 checks: depth writes different transforms, reveals reveal, header shrinks and hides, hover tilts,
drawer traps focus, reduced motion is still, no overflow at 320–1920). The screenshots are evidence;
the assertions are the part that fails a build.

| # | File | What it is there to prove |
| --- | --- | --- |
| 01 | `01-home-hero-1280.webp` | Hero at the most common desktop width: serif name, italic surname, one blue full stop, the cut-out portrait breaking its column |
| 02 | `02-home-hero-390.webp` | The same composition on a phone: name inside the first screen, wordmark dropped from the bar, two-up figures |
| 03 | `03-home-hero-scrolled-1280.webp` | The portrait and the type at different depths — the parallax is real, not a slide |
| 04 | `04-home-monogram-1280.webp` | The single canvas, in its own band, with copy that does not sit on the metal |
| 05 | `05-home-about-1280.webp` | Paper band, timeline drawn by an IntersectionObserver, no torn edge, no tape |
| 06 | `06-home-catalogue-1280.webp` | Bento with the 5/4/3 rhythm and the two sleeve series (ink and paper) |
| 07 | `07-home-visuals-1280.webp` | The pinned rail halfway through its 300 vh band |
| 08 | `08-home-press-1280.webp` | Press sheet: the one place paper is used because the object is paper |
| 09 | `09-home-footer-1280.webp` | Footer and contact bar |
| 10–11 | `10-music-index-1280.webp`, `11-music-index-390.webp` | Catalogue at two widths, with the hung columns |
| 12–15 | `12-artist-1280.webp` … `15-contact-1280.webp` | Every other route at the same width, so a page cannot regress unseen |
| 16 | `16-home-hero-1920.webp` | 1920, where a full-bleed hero usually starts to look empty |

## What this round found

Two defects that no static check could see, both fixed:

1. **The header had two sources of truth for its height.** An `animation-timeline: scroll()` rule
   (Chromium-only) was still shrinking the bar on top of the JS `data-state`, so Firefox and Safari
   read a different header than the one that was tuned. Removed (D-116).
2. **`scroll-behavior: smooth` and Lenis were fighting.** A programmatic jump of 2800 px stopped
   1000 px short of its target and the catalogue below never entered the viewport, so its reveal
   never fired — an intermittent empty section that a reader would have blamed on the site being
   broken. Native smooth scrolling is now off while Lenis is mounted (D-118).

The second one was found *because* the review script became a file in the repository: it jumped,
waited, screenshotted and asserted, every time, in the same order.
