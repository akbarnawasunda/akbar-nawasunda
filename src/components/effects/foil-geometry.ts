/**
 * The AN mark's geometry and the two baked layers that go with it.
 *
 * This module exists so the same drawing code can run in two places: on the main thread (the
 * fallback path) and inside `foil-plate.worker.ts` (the normal path). Nothing here touches
 * `document`, `window` or React — the only web APIs used are `Path2D` and a 2D context, both of
 * which exist in a worker.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THE DRAWING LIVES IN A WORKER AT ALL (FASE 4a follow-up)
 *
 * `buildPlate` looks cheap in isolation — it returns in ~3 ms — because a 2D context records
 * drawing commands and rasterises them lazily. The bill arrives at the first `drawImage` that reads
 * the canvas back, and it was measured at **50–62 ms** for one 1440×666 plate: 195 antialiased
 * one-pixel strokes, each spanning the mark's full width, clipped to a six-quad path.
 *
 * That bill landed on the main thread exactly when the mount gate opened, which is the reader's
 * first scroll. Measured before the fix: a single 92 ms task, a 117–183 ms frame gap at y≈360.
 * `OffscreenCanvas` in a worker moves the rasterisation off the main thread entirely; the main
 * thread receives an already-rasterised `ImageBitmap` and blits it in well under a millisecond.
 */
export type Quad = readonly [number, number, number, number, number, number, number, number];

/** The mark, as six quads in stroke space (y-up). */
export const STROKES: readonly Quad[] = [
  [0.0, 0.0, 0.17, 0.0, 0.57, 1.0, 0.4, 1.0],
  [0.83, 0.0, 1.0, 0.0, 0.6, 1.0, 0.43, 1.0],
  [0.24, 0.34, 0.76, 0.34, 0.7, 0.5, 0.3, 0.5],
  [1.28, 0.0, 1.45, 0.0, 1.45, 1.0, 1.28, 1.0],
  [1.28, 1.0, 1.46, 1.0, 2.28, 0.0, 2.1, 0.0],
  [2.11, 0.0, 2.28, 0.0, 2.28, 1.0, 2.11, 1.0],
];

export const MARK_W = 2.28;
export const MARK_H = 1;

/*
 * Two plate ramps, because the same drawing is composited twice at very different alphas.
 *
 * On a desktop the foil sits at full strength: dark gunmetal with a raking sweep, the material the
 * shader was trying to render. On a phone the layer is `opacity: .2` by the owner's spec, and a
 * gunmetal plate at 20 % over `#050506` is *nothing* — the band became a black hole with one faint
 * travelling line. So the ambient variant uses a bright silver ramp: at 20 % it lands around #28,
 * which is a receding mark rather than a vanished one. The spec governs the opacity; the material
 * has to survive it.
 */
export const RAMP_DESKTOP = ["#25282e", "#101216", "#1c1f25", "#08090b"] as const;
export const RAMP_AMBIENT = ["#9aa1ab", "#3d434c", "#828a95", "#23272c"] as const;

export interface Layout {
  /** Left edge of the mark's box, in CSS px. */
  x: number;
  /** Top edge. */
  y: number;
  /** Size of one unit of stroke space, in CSS px. */
  unit: number;
}

export function layoutFor(width: number, height: number): Layout {
  /* The band is wide and short and the mark is 2.28:1. Fit the smaller ratio and centre — the same
     "scale to the smaller axis" rule the camera fit used, so the mark never overflows on a narrow
     screen. */
  const padding = Math.max(16, Math.min(width, height) * 0.06);
  const unit = Math.min((width - padding * 2) / MARK_W, (height - padding * 2) / MARK_H);
  return {
    x: (width - MARK_W * unit) / 2,
    y: (height - MARK_H * unit) / 2,
    unit,
  };
}

export function markPath(layout: Layout): Path2D {
  const path = new Path2D();
  for (const quad of STROKES) {
    const [x1, y1, x2, y2, x3, y3, x4, y4] = quad;
    /* Stroke space is y-up (it came from a 3D scene); canvas is y-down. */
    path.moveTo(layout.x + x1 * layout.unit, layout.y + (1 - y1) * layout.unit);
    path.lineTo(layout.x + x2 * layout.unit, layout.y + (1 - y2) * layout.unit);
    path.lineTo(layout.x + x3 * layout.unit, layout.y + (1 - y3) * layout.unit);
    path.lineTo(layout.x + x4 * layout.unit, layout.y + (1 - y4) * layout.unit);
    path.closePath();
  }
  return path;
}

/** Device-pixel offsets used to dilate the mask by exactly one pixel. */
const RING_OFFSETS: readonly (readonly [number, number])[] = [
  [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1],
];
/** Right-facing only: the rim light has a direction, so the accent does too. */
const RIGHT_OFFSETS: readonly (readonly [number, number])[] = [[1, 0], [1, -1], [1, 1]];

export interface Palette {
  blue: string;
  primary: string;
  hairline: string;
}

/**
 * A surface the builders can draw into. `document.createElement("canvas")` on the main thread,
 * `new OffscreenCanvas(…)` in the worker — the 2D API they expose is the same subset used here.
 */
export type Surface = HTMLCanvasElement | OffscreenCanvas;

export type SurfaceFactory = (width: number, height: number) => Surface;

/** A built layer: a real canvas on the main thread, a transferred bitmap from the worker. */
export type Layer = Surface | ImageBitmap;

export interface Plates {
  /** Ramp + brushed grain, clipped to the mark. */
  base: Layer | null;
  /** Outline and rim light, flattened in the order the frame draws them. */
  rims: Layer | null;
}

/**
 * Build a one-pixel ring around the union of the strokes.
 *
 * The union matters: filling six quads into one path (nonzero winding) gives a solid silhouette,
 * and the ring is that silhouette dilated by one pixel minus itself. Stroking each quad instead —
 * which is what this file did first — prints every internal seam and reads as a wireframe, not as
 * a solid object with an edge.
 */
function buildRing(
  make: SurfaceFactory,
  width: number,
  height: number,
  dpr: number,
  path: Path2D,
  offsets: readonly (readonly [number, number])[],
  colour: string,
  alpha: number,
): Surface | null {
  const px = Math.max(1, Math.round(dpr));
  const w = Math.max(1, Math.round(width * px));
  const h = Math.max(1, Math.round(height * px));

  const mask = make(w, h);
  const maskCtx = mask.getContext("2d") as CanvasRenderingContext2D | null;
  if (!maskCtx) return null;
  maskCtx.setTransform(px, 0, 0, px, 0, 0);
  maskCtx.fillStyle = "#fff";
  maskCtx.fill(path);

  const ring = make(w, h);
  const ringCtx = ring.getContext("2d") as CanvasRenderingContext2D | null;
  if (!ringCtx) return null;
  for (const [dx, dy] of offsets) ringCtx.drawImage(mask as CanvasImageSource, dx * px, dy * px);
  ringCtx.setTransform(1, 0, 0, 1, 0, 0);
  ringCtx.globalCompositeOperation = "destination-out";
  ringCtx.drawImage(mask as CanvasImageSource, 0, 0);
  ringCtx.globalCompositeOperation = "source-in";
  ringCtx.globalAlpha = alpha;
  ringCtx.fillStyle = colour;
  ringCtx.fillRect(0, 0, w, h);
  return ring;
}

/*
 * The plate, drawn once: the vertical ramp plus the brushed grain, both clipped to the mark.
 *
 * Nothing here depends on the clock, the pointer or the scroll position, so none of it belongs in
 * the frame loop. The grain is the expensive part — one `stroke()` per 3 px of mark height, ~195
 * draw calls at 1440x666 — and it was being re-issued 60 times a second to produce identical pixels.
 *
 * Grouping the rows into two multi-subpath strokes was measured as an alternative: pixel-identical
 * (0 / 959 040 differ) but only 5 ms cheaper, because the cost is the rasterised area, not the
 * number of calls. A 6 px pattern tile was 6× cheaper and **rejected**: 12 % of pixels differed by
 * up to 18/255, which is a visual change, not a refactor.
 */
export function buildPlate(
  make: SurfaceFactory,
  width: number,
  height: number,
  dpr: number,
  layout: Layout,
  path: Path2D,
  palette: Palette,
  ambient: boolean,
): Surface | null {
  const px = Math.max(1, Math.round(dpr));
  const plate = make(Math.max(1, Math.round(width * px)), Math.max(1, Math.round(height * px)));
  const plateCtx = plate.getContext("2d") as CanvasRenderingContext2D | null;
  if (!plateCtx) return null;
  plateCtx.setTransform(px, 0, 0, px, 0, 0);

  const top = layout.y;
  const bottom = layout.y + MARK_H * layout.unit;
  const left = layout.x;
  const right = layout.x + MARK_W * layout.unit;

  plateCtx.save();
  plateCtx.clip(path);

  const ramp = ambient ? RAMP_AMBIENT : RAMP_DESKTOP;
  const base = plateCtx.createLinearGradient(0, top, 0, bottom);
  base.addColorStop(0, ramp[0]);
  base.addColorStop(0.28, ramp[1]);
  base.addColorStop(0.62, ramp[2]);
  base.addColorStop(1, ramp[3]);
  plateCtx.fillStyle = base;
  plateCtx.fillRect(0, 0, width, height);

  plateCtx.strokeStyle = palette.primary;
  plateCtx.lineWidth = 1;
  for (let y = top; y <= bottom; y += 3) {
    const row = Math.round((y - top) / 3);
    plateCtx.globalAlpha = row % 2 === 0 ? 0.028 : ambient ? 0.09 : 0.055;
    plateCtx.beginPath();
    plateCtx.moveTo(left, y + 0.5);
    plateCtx.lineTo(right, y + 0.5);
    plateCtx.stroke();
  }
  plateCtx.globalAlpha = 1;
  plateCtx.restore();
  return plate;
}

/** Outline and rim light composited once, in the order the frame used to draw them. */
export function buildRimLayer(
  make: SurfaceFactory,
  width: number,
  height: number,
  dpr: number,
  path: Path2D,
  palette: Palette,
): Surface | null {
  const outline = buildRing(make, width, height, dpr, path, RING_OFFSETS, palette.hairline, 1);
  const blueRim = buildRing(make, width, height, dpr, path, RIGHT_OFFSETS, palette.blue, 0.55);
  if (!outline && !blueRim) return null;

  const px = Math.max(1, Math.round(dpr));
  const layer = make(Math.max(1, Math.round(width * px)), Math.max(1, Math.round(height * px)));
  const layerCtx = layer.getContext("2d") as CanvasRenderingContext2D | null;
  if (!layerCtx) return null;
  /* Same order as the per-frame blits it replaces: right rim first, outline over it. */
  if (blueRim) layerCtx.drawImage(blueRim as CanvasImageSource, 0, 0);
  if (outline) layerCtx.drawImage(outline as CanvasImageSource, 0, 0);
  return layer;
}

/** Both baked layers, built against one surface factory. Used by the main thread and the worker. */
export function buildPlates(
  make: SurfaceFactory,
  width: number,
  height: number,
  dpr: number,
  ambient: boolean,
  palette: Palette,
): { layout: Layout; path: Path2D; plates: Plates } {
  const layout = layoutFor(width, height);
  const path = markPath(layout);
  return {
    layout,
    path,
    plates: {
      base: buildPlate(make, width, height, dpr, layout, path, palette, ambient),
      rims: buildRimLayer(make, width, height, dpr, path, palette),
    },
  };
}
