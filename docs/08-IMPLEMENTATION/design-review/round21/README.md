# Round 21 — the owner's screenshots, audited

The owner sent 17 captures of the live site and asked, plainly: "mana yang jelek dan kacau".
Two things qualified. Both fixed here; both were placeholder/padding debt, not layout breakage.

## 1. The catalogue wall read as random boxes (kacau)

The sleeve generator printed two series — ink-on-black and paper-white — chosen by a slug hash
(D-117). On a four-column wall the mix has no visible rule, so it reads as chaos; and the ink half
sat so close to the page black that those cards looked like holes, not sleeves. Round 21 reverses
D-117: one series for all ten, with presence — ground `#101014` (one step off the page), a hairline
crop-mark frame, the ghost mark at 0.16, press-cyan misregistration rule at the bottom edge. Still
type-free, still ~3 KB each, still not pretending to be artwork.

## 2. The mobile release page opened on a dead black band

`.bandInner` carried `header-height + space-8` of top padding — right on desktop, where the sleeve
anchors the space beside the copy; on a phone the sleeve sits *below* the copy, so the air had
nothing in it. ≤767 px now gets `header-height + space-4`.

## Evidence

- `d-wall.webp`, `m-wall.webp` — the unified catalogue, desktop and phone;
- `d-release.webp`, `m-release.webp` — the release page after the padding fix.

Gates at commit: tokens 86 · tests 132/132 · qa:motion 22/22 · check:web 189.6 KB gz JS /
16.7 KB gz CSS.
