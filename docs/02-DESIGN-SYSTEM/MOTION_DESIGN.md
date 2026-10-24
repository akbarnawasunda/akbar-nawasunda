# MOTION_DESIGN

Motion is how the page proves it has depth. The rule is the same one the design uses everywhere:
**a move has to mean something** — where an element sits in space, how heavy it is, where the reader
came from. Nothing moves because it was idle.

## The engine

One file: `src/components/zine/scroll-engine.ts`. One rAF loop, one passive scroll listener, one
batched read pass and one batched write pass per frame, for the whole page. Elements subscribe with
`<Depth y={-140} z={90} scale={0.06}>`, which hands the wrapper to the engine and gets out of the way.

| Token | Value | Where |
| --- | --- | --- |
| fast | 150 ms | Hover colour, border, arrow |
| base | 250 ms | Buttons, card lift |
| entrance | 700–900 ms | Hero lines, `Reveal` |
| easing | `--ease-out` | Entrance, depth |
| easing (interface) | cubic-bezier(.4, 0, .2, 1) | Hover, focus |

## What moves

- **Hero**: three layers at three speeds. The portrait rises ~140 px against the type's ~58 px and
  travels 90 px toward the reader; the stats lag the other way (+26 px). That difference is the
  depth — nothing on the page actually changes size.
- **Section heads, press sheet, inner-page intros**: a slow 26–40 px drift with a small opacity
  falloff, so a section arrives rather than appears.
- **Blocks on first entry** (`Reveal`): 34 px up, 40 px back, 7° of rotateX, once, then static.
- **Cards**: 1.5–2° of tilt and a 4–6 px lift on hover only. Touch devices never see it.
- **Header**: 72 → 56 px, and off-canvas while the reader scrolls down. Driven by `data-state` /
  `data-hidden` from the header's own effect — the same in every engine (D-116).
- **Genre strip**: the only infinite animation on the site (46 s), paused on hover/focus.
- **Visual rail**: a real pin. `registerPin(node)` writes `--rail-pin` 0 → 1 across the band's pinned
  travel and the CSS turns it into `translate: calc(var(--rail-pin) * (100vw - 100%))`. The 300 vh
  band and the sticky stage only exist while `[data-pinned]` is set, so no JS (or reduced motion)
  means an ordinary horizontal scroller, not three empty screens.
- **Paper timeline**: the SVG line draws itself over 1.4 s the first time it is seen
  (`DrawOnView`, an IntersectionObserver setting `data-drawn`). Previously a view timeline, i.e.
  invisible on most browsers.
- **Catalogue ticker** (round 7): `registerPin(node, { mode: "travel" })` writes `--ticker` 0 → 1 as
  the band crosses the screen, and the CSS turns it into `translate: calc(var(--ticker) * -50%)`.
  Scrubbed by the reader, never by a timer — there is still no endless animation on the site.
- **Index preview** (round 7): a fixed sleeve that follows the pointer via `translate3d` written
  from a ref (no React re-render), and anchors to the row on keyboard focus. No motion under
  reduced motion; the rows still invert, because a colour change is not motion.

## Why JavaScript owns the scroll and not CSS

The previous pass used `animation-timeline: view()` for everything, on the theory that the compositor
is free. It is — but scroll timelines only shipped in Safari 26, so **every iPhone before that saw a
completely static page**, which was reported back as "ga ada animasi".

By round 6 there were three survivors of that pass — the header shrink, the visual rail and the paper
timeline. All three are gone, and the rule is now absolute: **no effect exists in only one engine.**
The engine (or, for one-shot entrances, an IntersectionObserver) owns every move the reader is meant
to notice; CSS owns the timing curves, not the triggers.

There is one more trap in the same family: native `scroll-behavior: smooth` and Lenis both ease the
scroll position, and when both are running a programmatic jump lands wherever the two animations
collide. `html.lenis { scroll-behavior: auto }` turns the native one off while Lenis is mounted
(D-118); reduced-motion and touch never load Lenis and keep the native behaviour.

## Guardrails

- `prefers-reduced-motion: reduce` → nothing registers, nothing animates; the page renders in its
  resting state. Content is never revealed *by* an animation.
- Transforms and opacity only. No `top`/`left`/`width` writes per frame.
- No scroll-jacking: Lenis is desktop-wheel inertia only, and it writes `window.scrollTo` rather than
  hiding the overflow, so native scrolling, keyboard paging and `scrollIntoView` keep working.
- No infinite parallax, no particle field, no auto-playing 3D spin.
