# Round 7 — "frekuensi"

The owner's brief was blunt: the concept was still ugly, and the bar was *martingarrix.com and
alanwalker.com*. Those two sites share a shape that the previous three passes did not have:

| What they do | What this page did before | What it does now |
| --- | --- | --- |
| One huge photograph behind a name set at viewport scale | A cut-out portrait beside a serif headline | The owner's own empty-stage frame, full bleed, name at 14vw |
| Sections separated by photographs and full-width colour, not by cards | Ten bordered, rounded panels with mono labels | Bands: photograph → ticker → spread → paper index → photograph → paper sheet |
| A release *spread* (art + type at scale) | A 16:9 tile inside a bento grid | Newest release at 4.75rem with the sleeve at half the screen |
| Discography as a list you can scan in five seconds | Ten equal tiles you scan one at a time | Ten rows of 3rem serif with a pointer-following sleeve |
| Two grounds: the dark room and the printed page | One dark ground for 20,000 px | Paper index band, paper press sheet, dark everything else |

## Shots

| # | File | Why it exists |
| --- | --- | --- |
| 01 | `01-home-hero-1280.webp` | The thesis: photograph, masthead, 14vw name, one blue full stop |
| 02 | `02-home-hero-390.webp` | The same on a phone: name above the fold in the first screen |
| 03 | `03-home-hero-scrolled-1280.webp` | Photograph and type at different speeds (verified, not eyeballed: `qa:motion`) |
| 04 | `04-home-ticker-1280.webp` | The running head — catalogue titles scrubbed by scroll |
| 05 | `05-home-release-1280.webp` | The newest release as a spread |
| 06–07 | `06-home-index-1280.webp`, `07-home-index-390.webp` | The paper index at two widths |
| 08 | `08-home-night-1280.webp` | The night frame with the biography sentence, nothing else |
| 09 | `09-home-about-1280.webp` | About sheet with the drawn timeline |
| 10 | `10-home-archive-1280.webp` | Archive rail, now frameless |
| 11 | `11-home-monogram-1280.webp` | The single canvas band |
| 12–13 | `12-home-press-1280.webp`, `13-home-footer-1280.webp` | Press sheet, footer |
| 14–16 | `14-music-index-1280.webp`, `15-artist-1280.webp`, `16-release-1280.webp` | The rest of the site at the same width |
| 17 | `17-home-hero-1920.webp` | 1920, where a full-bleed hero usually starts to look empty |

## What changed, in one line each

1. **Cards are gone from the homepage.** Every bordered/rounded panel on the page was replaced by a
   band, a rule or a photo. `ReleaseBento` is still used on `/music`; the homepage no longer has it.
2. **The homepage has two grounds.** Ink for the room, paper for the index and the press sheet.
3. **Type scale is the hierarchy.** 14vw name, 9vw section word ("Indeks"), 3vw release titles,
   10px labels. Almost nothing in between.
4. **A signature band.** `ReleaseTicker` — the catalogue as a running head, scrubbed by the shared
   scroll engine (`registerPin`, `mode: "travel"`), still a set of links, static under reduced
   motion.
5. **An index, not a grid.** `CatalogueIndex` — ten rows, pointer-following sleeve, inversion on
   hover, and it works from the keyboard because focus anchors the preview to the row.
6. **The real photographs are used.** The empty-stage frame is the hero; the night-street frame is
   the quote band. Before this round both files were only in the archive.

## Gate

`121/121` tests · typecheck + lint clean · axe **0 / 14** (the muted-grey labels on ink and paper
were failing AA and were moved to secondary ink) · smoke **28/28** · `qa:motion` **14/14**, including
the new checks for the ticker scrub, the index inversion and the sleeve lift · JS **189.9 KB gz** /
CSS **13.6 KB gz** · 16 routes / 22 anchors / 46 media resolve.
