# Round 26 — de-duplication, visible water, no markers, photo slots in the studio

Owner's note, in order: some pages repeat themselves; the liquid animation "ga berfungsi atau gak
ada sama sekali"; the page "ngelag banget"; socials should carry SVG so they are not empty; scroll
should be smoother (hijacked) and every marker/penanda gone because they read as AI-made; empty
photo slots should connect to the studio; entry and page-turn loading should follow the logo; and
the menu button disappears after choosing a page from the menu.

## 1 — The page says each thing once

- Home: the ten index rows are gone. They printed the same ten releases the rail prints one
  section earlier — the rail keeps the objects *and* their titles/meta, and gains the only hover
  the strip needs (the sleeve breathes to 1.04). `CatalogueIndex` left the repo with its fixture
  entries; the qa hover check and the review shot now target `[data-rail-item]`.
- /music: the wall no longer repeats the lead release that owns the takeover poster above it.
- /artist: the platform row is gone (the footer carries the channels on every page), and the
  stage band no longer borrows the home page's hero photograph — it is a photo *slot* now (§6).

## 2 — The water is visible, and cheap

Round 25 hid an 8px split behind an opaque base and paid for a full-viewport SVG displacement
filter on every pointer move. The filter was the lag (turbulence re-rasterised per frame) and the
fringe was the "nothing". Round 26 deletes the filter entirely: the two split copies ride **above**
the base at half strength and part along the pointer vector by `--space-6` (the base counter-leans
by `--space-3`), and the whole stack swells half a percent under the hand. Three compositor
transforms and an opacity — `d-home-liquid.webp` shows the mark doubling under the cursor.

## 3 — Every penanda is gone

`ScrollProgress`, `CursorDot`, the HUD corner crosses (hero + monogram band), the round-25
registration crosses (night frame + stage band) and the "Geser →" rail hint are deleted from the
repo, not hidden. What remains on screen is content: type, photographs, sleeves, hairlines.

## 4 — Scroll

The wheel hijack (Lenis, mounted once in the site layout) stays — it is the smooth scroll the owner
asked for, and it never breaks native scrolling, snap or keyboard paging. What made the page feel
laggy against it was the displacement filter and the band's full-viewport mask, both gone (§2);
the mask on the monogram band was removed too, so a scroll frame costs one composited opacity.

## 5 — Socials carry their marks, the menu keeps its button

- The footer's follow row sets each profile's monochrome SVG mark above its word
  (`PlatformIcon`, the in-house 24px grid) — no more empty text cells.
- The menu control now shows its state: open, the two lines cross into an X and the word becomes
  TUTUP; the bar that closes the dialog sits above the dialog (`z-chrome + 1`) and never hides
  behind the scroll while the dialog is open; and a route change lands at the top, at rest, bar
  visible — the coasting-scroll landing that made the button "disappear" after a menu click.

## 6 — Photo slots, wired to NAWA Studio

Three named photograph positions — `latar` (home hero), `malam` (home night), `panggung` (/artist
stage) — resolve in this order: a studio upload served at `/api/public/foto/<slot>`, then the
verified repository asset, then an honest bone frame reading "Slot foto kosong · isi melalui NAWA
Studio". Uploads live as base64 rows in a new `studio_photos` table (no object-storage provider
needed), validated server-side (WebP/PNG/JPG/AVIF, ≤2 MB), managed from Studio → Media → "Foto
situs" (`PhotoSlotsForm`: unggah / kosongkan per slot). Public pages read only filled slots
(`getPublicPhotos`), are ISR at 60 s, and the save action revalidates `/` and `/artist` so a filled
slot appears immediately. Verified end-to-end locally: seeded row → 200 `image/webp` at the public
route → `/artist` prerendered with the slot URL; row deleted → the empty frame returns.

## 7 — The turn reel

`RouteCurtain`: on every client-side navigation one ink sheet sweeps up, the AN mark rides the
middle of it, the sheet leaves and the new page is underneath — 950 ms, transforms and opacity
only, `aria-hidden`, `pointer-events: none`, absent under reduced motion. Cold loads keep the
existing leader curtain; together entering and turning feel like one reel, cut on the logo.

## Shots

| file | what it proves |
| --- | --- |
| `d-home-hero.webp` | no progress bar, no crosses, smaller scale holding |
| `d-home-liquid.webp` | the mark visibly parting under the cursor |
| `d-home-rail.webp` | rows gone, rail alone carries the discography |
| `d-footer-socials.webp` | SVG marks over the follow words |
| `d-menu-open.webp` | TUTUP + X, bar above the drawer |
| `d-artist-slot.webp` | the empty bone photo slot, studio-labelled |
| `m-home-hero.webp`, `m-artist-slot.webp` | both at 390 px |

Gates at this commit: typecheck 0 · lint 0 · tokens 91 · tests 132/132 · a11y 0 violations across
16 loads · qa:motion 22/22 · review:shots 19/19 · check:web JS 189.2 KB gz / CSS 16.9 KB gz.
