# Release artwork

One file slot per release slug. Ten verified releases exist today, and the split is now real: the
seven releases that publish a streaming link have their artwork fetched into `<slug>.webp`, and the
three that publish no link keep a generated sleeve in `<slug>@sleeve.webp`. The sleeves stay in the
repository on purpose — they are the fallback for any slug without artwork, not dead files.

## The waterfall (src/content/covers.ts)

| Level | What | File | Who makes it |
|---|---|---|---|
| 1 | Owner artwork | `<slug>.webp` / `.avif` / `.jpg` / `.jpeg` / `.png` | the owner, by hand |
| 2 | Spotify artwork | `<slug>.webp` | `npm run covers:fetch` (800 × 800, ≤ 150 KB) |
| 3 | Generated sleeve | `<slug>@sleeve.webp` | `npm run covers:sleeves` |
| 4 | Owner override | any of the level-1 extensions | the owner |

Levels 1 and 2 share one slot on purpose: `covers:fetch` writes the same file a manual upload would,
so nothing in the site has to know where the pixels came from. The generated sleeve lives in its own
`@sleeve` slot so dropping a real cover in never means deleting anything. Since round 19 the sleeve
carries no type at all — ground, ghost monogram, misregistration rule — and every release title on
the site is Gohan HTML text printed by the card.

## scripts/generate-placeholder-covers.mjs

```
npm run covers:sleeves          # fill in what is missing
npm run covers:sleeves -- --force
```

1000 × 1000 WebP, built only from verified brand elements: the AN monogram at ~10%, the page ground
`#0A0A0E` (or paper `#E8E6E1` for the inverted half of the series), and a 4 px misregistration rule —
press cyan `#2E8C86` on the
ink series, poster red `#C93A22` on the paper one. No stock photo, no invented artwork, no
per-release genre (genres are verified for the artist, not for each song).

It renders **no type at all** (round 19): a sleeve that prints its own title in a face the page does
not ship is the ransom-note effect the owner rejected, and rasterised text cannot reflow, be selected
or be translated. Every release title on the site is Gohan HTML text printed by the card under the
artwork. The script therefore needs no fonts installed — only `sharp`.

## Adding real artwork

Drop `<slug>.webp` here. Nothing else to do: the next render picks it up, and `covers:sleeves` will
start skipping that slug. Keep it square and under 150 KB.
