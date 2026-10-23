# Release artwork

One file slot per release slug. Six verified releases exist today; none of them has owner-supplied
artwork yet, so each one has a generated sleeve.

## The waterfall (src/content/covers.ts)

| Level | What | File | Who makes it |
|---|---|---|---|
| 1 | Owner artwork | `<slug>.webp` / `.avif` / `.jpg` / `.jpeg` / `.png` | the owner, by hand |
| 2 | Spotify artwork | `<slug>.webp` | `npm run covers:fetch` (800 × 800, ≤ 150 KB) |
| 3 | Generated sleeve | `<slug>@sleeve.webp` | `npm run covers:sleeves` |
| 4 | Owner override | any of the level-1 extensions | the owner |

Levels 1 and 2 share one slot on purpose: `covers:fetch` writes the same file a manual upload would,
so nothing in the site has to know where the pixels came from. The generated sleeve lives in its own
`@sleeve` slot so dropping a real cover in never means deleting anything, and so the card can tell
the two apart — a sleeve already has the title printed inside the image, so the tile does not print
it a second time under the artwork.

## scripts/generate-placeholder-covers.mjs

```
npm run covers:sleeves          # fill in what is missing
npm run covers:sleeves -- --force
```

1000 × 1000 WebP, built only from verified content: the release title, the original artist and year
when they are known, the AN monogram at 10%, `#101014`, and the 4 px `#0087FF → #7800FF` rule. No
stock photo, no invented artwork, no per-release genre (genres are verified for the artist, not for
each song).

It renders text with **Syne** (display) and **JetBrains Mono** (labels) — the two families the site
ships — so those fonts have to be installed where the script runs (`~/.fonts` is enough). Without
them the rasteriser falls back to a system sans and the sleeve will look wrong; check the output.

## Adding real artwork

Drop `<slug>.webp` here. Nothing else to do: the next render picks it up, and `covers:sleeves` will
start skipping that slug. Keep it square and under 150 KB.
