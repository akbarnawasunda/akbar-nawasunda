# Round 14 — the monogram, un-printed

The owner reversed round 13's decision for one component only. Round 13 turned the AN monogram into
a flat paper cut-out to match the zine palette; the owner's own brand banner is *futuristic,
cyberpunk, metallic, high-tech*, and the mark is the site's one "wow" object. It is chrome again.

Files: `07-monogram-1440.webp`, `07-monogram-390.webp`.

## What changed

- **Material.** `MeshPhysicalMaterial`, metalness 0.9, roughness 0.16, clearcoat 0.85 /
  clearcoatRoughness 0.06, ACES tone mapping back on (it is what stops a chrome highlight clipping
  to white).
- **Environment.** Not `RoomEnvironment`. Its white studio panels reflect off a 0.9-metalness
  surface as blown-out white patches — the first pass of this scene had a white wing instead of a
  chrome one, and the owner's reference is a *dark* object in a *dark blue* room. So the environment
  is authored procedurally: an equirectangular canvas with a cold wash, a broad neon pool, a second
  dimmer pool on the far side, a horizon band and two overhead strips, run once through PMREM.
  Nothing downloaded, and the chrome reflects blue instead of grey.
- **Light.** One `PointLight` in brand neon (`#0087FF`) raking from the left, one dimmer one behind
  and above. No key, no fill: a second white light flattens the object back into a product render.
- **Glow.** The silhouette edges are drawn in a bright blue-white line, a slightly larger additive
  shell sits just outside them, and an `UnrealBloomPass` (strength 0.55, radius 0.5, threshold 0.72)
  turns the pair into light. The threshold matters: at 0.62 the whole specular highlight bloomed and
  the neon came out white — a glow that eats its own colour. Everything above 0.72 stays blue.
- **Stage.** The canvas paints its own backdrop in a fragment shader: a vertical cold wash, a
  horizon, a perspective grid receding to a vanishing point, and slow per-row speed lines. Two masks
  keep it out of the way: the grid fades in only past the copy column (a 17 px paragraph cannot share
  a screen with a bright diagonal crossing it), and a scrim darkens the bottom-left corner where the
  heading, note and meta line live.
- **Post-processing is optional.** The composer is a separate lazy chunk; if it fails to import or
  throws, the scene renders straight to the canvas and the grid still carries the depth.

## Cost, measured

Draw calls and `requestAnimationFrame` callbacks counted by patching `drawElements`/`drawArrays`,
1440×900 at DPR 2:

| State | Draw calls / 2 s | rAF callbacks / 2 s |
| --- | --- | --- |
| Band below the fold | 0 | 0 |
| Band on screen | 288 | 24 |
| Scrolled away again | **0** | **0** |

- Off-screen means *cancelled*: `pause()` clears the pending frame, so an unseen canvas costs no
  frames at all.
- `devicePixelRatio` capped at **1.5** (backing store 2160 × 1158 at DPR 2), and the bloom pass
  renders at half resolution.
- Painted at 30 fps, not 60.
- **Mobile: no canvas at all.** Verified at 390×844 with touch: `canvas` count 0, band still reads.
  The band also loses its 86vh stage below 768 px — a band sized for an object it does not have was
  480 px of empty navy above the heading.

## The one place the deleted blue came back

Round 13 removed `#0087FF` from the entire site because it was the screen blue the redesign was
getting away from. It returns as `--color-neon-blue`, scoped to this band: the object's light, its
edges, and the `AN` in the band's heading. It is never a link, a button, or a rule.

## Gates

`audit:tokens` 88 ✓ · `typecheck` ✓ · `lint` ✓ · `test` 131/131 ✓ · `a11y` 0/16 ✓ ·
`qa:motion` 22/22 ✓ · `smoke` 28/28 ✓ · `check:web` 193.6 KB JS gz (budget 250) / 18.9 KB CSS ✓.
The 2 KB of extra initial JS is the component shell; three.js and the post-processing chain stay in
their own lazy chunks and are still absent from the initial payload.
