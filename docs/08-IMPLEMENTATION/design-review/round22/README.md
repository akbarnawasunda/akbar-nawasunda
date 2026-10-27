# Round 22 — the megah pass

Owner's grant, verbatim: make it as grand and professional as a major artist's site, no AI
smell, layout and design as good as possible, free rein over every file in the repo. Three
moves, all inside the standing contracts (tokens only, one scroll engine, no new loops, no
banned vocabulary, budgets untouched).

## 1. The name arrives like a curtain call

The hero name was pasting in. Each line now sits in its own overflow mask and rises out of it
once on load, 120 ms apart — one-shot keyframes with `both`, never infinite (the anti-slop
fixture bans looping CSS animation, and a name that re-enters forever is a slot machine).
`prefers-reduced-motion` collapses it to nothing through the global 1 ms rule.

## 2. The current release takes over the screen

New type step `--text-takeover` (one voice under the hero name). On home the transmission band
opens with a mono "Sedang beredar" flag and the release title at takeover scale, full-bleed
above the copy/sleeve row; `/music` opens the same way with a "Rilis unggulan" block before the
wall of ten. First attempt set the title inside the 7/12 column and it broke mid-word — the
restructure (title full-width, content row under it) is how a major label sets a current
release, and it is also the only way 8.4vw type fits a long Indonesian title.

## 3. Nothing else needed touching

404, footer wordmark, selection invert, focus rings, artist spread, EPK packet and the archive
rail were already at the bar; this round raised the two moments a visitor meets first.

Evidence: `d-home-hero`, `d-home-takeover`, `d-music-featured`, `m-home-hero`,
`m-music-featured`. Gates at commit: tests 132/132 · tokens 87 · qa:motion 22/22 · a11y 0/16 ·
check:web 189.6 KB gz JS / 16.9 KB gz CSS.
