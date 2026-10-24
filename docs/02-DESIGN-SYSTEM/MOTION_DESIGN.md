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
- **Header**: 72 → 56 px via `animation-timeline: scroll()` where supported, static elsewhere.
- **Genre strip**: the only infinite animation on the site (46 s), paused on hover/focus.
- **Visual rail**: sticky pin driven by a view timeline, with the native horizontal scroll as the
  fallback for engines without one.

## Why JavaScript owns the scroll and not CSS

The previous pass used `animation-timeline: view()` for everything, on the theory that the compositor
is free. It is — but scroll timelines only shipped in Safari 26, so **every iPhone before that saw a
completely static page**, which was reported back as "ga ada animasi". CSS scroll timelines remain in
place where they are pure enhancement (the header shrink), but anything the reader is meant to notice
is driven by the rAF loop, which works in every engine that runs JavaScript.

## Guardrails

- `prefers-reduced-motion: reduce` → nothing registers, nothing animates; the page renders in its
  resting state. Content is never revealed *by* an animation.
- Transforms and opacity only. No `top`/`left`/`width` writes per frame.
- No scroll-jacking: Lenis is desktop-wheel inertia only, and it writes `window.scrollTo` rather than
  hiding the overflow, so native scrolling, keyboard paging and `scrollIntoView` keep working.
- No infinite parallax, no particle field, no auto-playing 3D spin.
