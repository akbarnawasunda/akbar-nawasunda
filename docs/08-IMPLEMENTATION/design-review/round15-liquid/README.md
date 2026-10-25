# Round 15, part two — liquid metal

Evidence for the last 3D instruction: the monogram is no longer a sculpture that rotates, it is a
surface that flows, swells under the pointer and leans towards it.

| file | what it shows |
| --- | --- |
| `liquid-ripple.webp` | 8 frames, pointer swept in a circle over the object. The swell travels with the cursor, the body leans into it, the noise field keeps the metal moving between contacts. |
| `liquid-idle.webp` | Pointer parked *outside* the band: no touch, no lean. What is left is the idle state — the slow noise flow and the breathing float. |
| `liquid-touch.webp` | A single touched frame, for anybody who cannot play an animated WebP. |

## How these were captured

```
/ (prod build, 1180x740) → sessionStorage["an-curtain"]=1 → instant scroll to
section[aria-labelledby="signature-title"] → wait for the canvas → wait 9 s for the shader
compile and the first PMREM pass → park the pointer → screenshot the <canvas> element.
```

Three things had to be got right, and each was wrong at first:

- **Screenshot the canvas element, not a viewport clip.** `page.screenshot({ clip })` takes page
  coordinates, not viewport coordinates, so an unscrolled hero was captured instead of the band
  (the band sits ~4,800 px down). An element screenshot resolves the offset itself.
- **Disable the curtain before the document boots** (`evaluateOnNewDocument`). The title
  sequence's exit scrolls the page back to the top, which fought every later scroll.
- **Desk width matters.** At 820 px the camera framing turns the mark into a close-up of two
  facets; at 1180 px the whole mark is inside the frame, which is the only framing in which the
  deformation can be read as liquid rather than as breakage.

SwiftShader renders this scene at roughly one frame per second, so the capture waits on wall-clock
time rather than on painted frames; the eight frames are 0.9 s apart in the sweep, not
consecutive paint ticks. Motion smoothness was therefore *not* measured from these images — the
frame rate claims in the component come from the frame budget in the loop (30 fps idle, 60 fps
while touched), not from this capture.

## What is actually being asserted

- `MeshPhysicalMaterial`, `metalness: 1`, `roughness: 0.1`, clearcoat on, PMREM environment —
  still chrome, with the noise injected into its own vertex shader via `onBeforeCompile`, so the
  lighting model is untouched.
- A 3D simplex-noise vector field displaces every vertex; the same offset is injected into the
  chrome, the neon edge line and the halo, so the rim stays welded to the moving surface.
- The pointer is raycast into a camera-facing plane through the object and converted to object
  space, so the swell appears where the cursor is, at any lean angle.
- Idle is a float (0.035 units, ~0.62 rad/s) plus a slow sway — no rigid spin.
- No physics engine: the only forces are the noise field and the pointer.
