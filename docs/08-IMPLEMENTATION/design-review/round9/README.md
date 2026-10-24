# Round 9 — cetak ganda (double print)

The owner's note on round 8: *"kurang bagus ahh, lu bisa bikin konsep yang bener bener ga masuk akal
ga? edan banget bagusnya"*. Fair. Round 8 answered four separate complaints; it did not have a
concept of its own. This round has one, and every page is a consequence of it.

## The concept

**The site is one printed sheet, and it has two sides.**

It is printed twice — ink and a colour plate that will not stay in register — and you can turn it
over. That is it. Everything below follows from those two facts, and nothing on the site is
decoration that does not.

1. **Two plates.** Every display heading on the site is printed in ink with a second plate pulled
   off-register behind it. The offset is not animated and not random: it is written by the pointer
   (`--ink-x`, `--ink-y`, one lerped rAF), so the whole site goes out of register together, the way
   a press would if the paper slipped. Blue plate on ink grounds, poster red on the blue fields and
   on stock — because a blue ghost on blue is invisible and a red ghost on paper is what a second
   red run actually looks like.
2. **Two sides.** The sheet has a back. A paper tab on the right edge (`BALIK LEMBAR`) swings the
   whole viewport over on its spine and shows the verso: the full catalogue with its real links,
   every platform, the inks by name, the run number, and the list of what is still missing. It is the
   unglamorous side of the object — the data sheet — printed in the same ink on the same stock.
3. **Registration marks.** Every printed surface carries the printer's cross and the name of the run
   (`R9 · cetak ganda`). They are the key that tells a visitor the doubled type is deliberate.

## Why this is not "more effects"

The previous rounds added objects (a wall, a plate, a stamp, a curtain). This one changes what the
*page* is: not a screen with elements on it, but a physical sheet with a front, a back, and a
tolerance. The consequences are structural, not decorative:

- A colour plate that moves means the site's **colour** is now a printing decision, not a palette
  decision — which is the answer to round 8's "gak ada warna punya gua" that a colour swatch could
  never give.
- A **back side** means the site can be honest somewhere. The catalogue, the links, the missing
  pieces (`[NEEDS OWNER]`, un-fetched covers, the privacy text) are not buried in a footer: they are
  printed on the other side, in public, in the same type.
- A **register** means the design has a tolerance. Nine pixels is the whole system's error bar.

## The rules that keep it legible

Print language is easy to make unreadable, so the rules are explicit and measured:

| Rule | Why |
| --- | --- |
| The ghost is a `text-shadow`, never a duplicated element | It cannot be selected or read out, it survives `<em>` inside a heading, and it never changes the ink's own colour — so contrast is always measured on the real type |
| Body copy never carries a plate | 16 px type with a 5 px second plate is a legibility bug, not a print reference |
| Shift scales with the type: 7 px on the hero, 5 px on page heads, 3–4 px on section heads and the verso | The plate has to be proportional to the letters, the way a real misregistration is proportional to the sheet |
| No pointer on touch, no loop at rest, nothing under reduced motion | `--ink-x/--ink-y` default to 0, which is the registered state: flat print, full legibility, no hidden content |
| Plate colour follows the ground | Blue on ink, red on the blue fields and on stock |

## What changed on each route

| Route | What the double print does there |
| --- | --- |
| `/` | Hero name at 7 px — two passes of the same 13 rem serif; the paper `Indeks` band switches to the red plate |
| `/music` | `Musik` in ink with a red plate on the blue head; registration mark in the corner; the wall below is untouched |
| `/music/[slug]` | The release title is a sleeve printed twice; the listening rows stay single-ink so they remain scannable |
| `/visuals`, `/epk`, `/contact`, `/artist` | The same masthead rule, the same marks, the same two inks |
| every route | `BALIK LEMBAR` → the verso |

## The verso, measured

- **22 links** on the back side: 10 releases (with their real streaming links), 14 platforms, the
  email. All rendered from the same content files the front uses — nothing is typed twice.
- It is a dialog: `inert` while closed, Escape closes, focus goes in and comes back to the tab, the
  page behind it cannot scroll (`html[data-sheet="open"]`).
- `qa:motion` asserts it covers the viewport, locks the page, holds ≥20 links and returns focus.
- `a11y` audits it **open** as its own surface — 16 page loads, 0 violations.

## Shots

| # | File | What it shows |
| --- | --- | --- |
| 01 | `01-misregister-hero-1280.webp` | The hero with the plate pulled to its limit: two passes of the name |
| 02 | `02-misregister-nocursor-1280.webp` | The registered state — no pointer means a flat print, and nothing disappears |
| 03 | `03-misregister-index-1280.webp` | The paper band, where the plate is the poster red |
| 04–09 | `04…09-misregister-*.webp` | Every inner route carrying the same rule |
| 10 | `10-back-side-1280.webp` | The verso: catalogue, platforms, inks, run number |
| 11 | `11-back-side-scrolled-1280.webp` | The verso's second half: what is still missing |
| 12–13 | `12-back-side-390.webp`, `13-back-side-tab-390.webp` | The verso on a phone, and the tab that opens it |
| 14 | `14-misregister-home-390.webp` | The hero on a phone (registered — touch has no pointer) |

## Gates

- `npm test` **121/121** · typecheck · lint — clean
- `npm run a11y` **0 violations / 16 loads** (the verso open included)
- `npm run qa:motion` **21/21** — three new assertions this round: the plate moves with the pointer,
  the verso covers and locks, Escape closes it and returns focus
- `npm run audit:tokens` **83 tokens**
- `npm run check:web` JS **189 KB gz / 11 chunks**, CSS **17.9 KB gz / 4 files**, 16 routes, no dead
  links
- `npm run smoke` **28/28**

## Known, and left alone on purpose

- `Hitungan Cinta Breakbeat Super Exc` is printed exactly as the owner's file has it. It looks
  truncated; guessing the end of a title is exactly what the content rules forbid.
- The plate is invisible on a phone by design: there is no pointer, so `--ink-x/y` stay 0. The verso
  is what a phone gets instead, and it is one tap away.
