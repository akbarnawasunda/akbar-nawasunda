"use client";

import { useEffect, useRef } from "react";

import styles from "./AnMonogram.module.css";

/**
 * The AN monogram, printed in metal foil — Canvas 2D, no GPU context.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THIS REPLACED THE SHADER
 *
 * Rounds 29–31 rendered the mark as an extruded three.js mesh with a vertex-stage melt and a
 * three.js environment map. On hardware that could not allocate a GPU context the band rendered a
 * black rectangle — the component's own availability probe returned false and the whole subtree
 * unmounted, leaving nothing but the fallback still — and under a software rasteriser the melt ran
 * at single-digit frames per second. A signature effect that some visitors never see is not a
 * signature effect.
 *
 * So the object is gone and the *material* is kept. What made the mercury read as expensive was
 * never the mesh: it was a dark plate with a raking specular sweep across it, a brushed grain, one
 * cold blue edge, and a single hairline around the silhouette. All four are 2D compositing
 * operations, and this file is those operations.
 *
 * ---------------------------------------------------------------------------------------------
 * THE VISUAL RULES (docs/DESIGN.md §4)
 *
 *   - monochrome plate + exactly one blue accent (`--color-signal-blue`, #0087FF). The accent is a
 *     1 px rim light on the right-facing strokes — a cold reflection, not a coloured light — and it
 *     is always present, so the brand blue never depends on where the sweep happens to be;
 *   - mechanical motion: the sweep travels at a constant velocity, the seam snaps on a fixed 900 ms
 *     clock, and the pointer highlight quantises to a 24 px grid. Nothing breathes, wobbles or
 *     drifts;
 *   - low–medium density: one gradient, one grain, one sweep, one seam, one rim. No particles, no
 *     noise field, no blobs — that vocabulary is the Web3/crypto template this site is not;
 *   - one silhouette line, not six. Each of the six stroke quads used to be outlined on its own,
 *     which printed the internal seams and made a solid object look like a wireframe; the outline
 *     is now dilated-and-subtracted from the union mask and cached per size.
 *
 * ---------------------------------------------------------------------------------------------
 * THE MOTION CONTRACT
 *
 *   - `prefers-reduced-motion: reduce` draws ONE frame at a fixed phase and never starts a loop;
 *   - the loop only runs while the band is on screen (`IntersectionObserver`), and the DPR is
 *     capped at 1.5;
 *   - `≤768px` is ambient: `data-ambient="true"` on the host, which the stylesheet turns into
 *     `opacity: .2` and `pointer-events: none`. It is an attribute, not a bare media query, so the
 *     state is inspectable in the DOM and by a test rather than inferred from CSS.
 *
 * This module owns the element and fills it. `AnMonogram` (the orchestrator) only decides when this
 * chunk is allowed to exist — it is the file that knows about the scroll gate — and there is exactly
 * one canvas element on the site and exactly one module that draws into it, which `tests/studio/
 * anti-ai.test.ts` enforces.
 */

/* ------------------------------------------------------------------ geometry (shared with the mark) */

type Quad = readonly [number, number, number, number, number, number, number, number];

/**
 * The monogram as stroke quads in a 0..1 box per letter, N offset by 1.28 — the same six
 * parallelograms the 3D mesh was extruded from, so the silhouette is unchanged by the migration.
 * Two legs and a crossbar for the A; two uprights and a diagonal for the N.
 */
const STROKES: readonly Quad[] = [
  [0.0, 0.0, 0.17, 0.0, 0.57, 1.0, 0.4, 1.0],
  [0.83, 0.0, 1.0, 0.0, 0.6, 1.0, 0.43, 1.0],
  [0.24, 0.34, 0.76, 0.34, 0.7, 0.5, 0.3, 0.5],
  [1.28, 0.0, 1.45, 0.0, 1.45, 1.0, 1.28, 1.0],
  [1.28, 1.0, 1.46, 1.0, 2.28, 0.0, 2.1, 0.0],
  [2.11, 0.0, 2.28, 0.0, 2.28, 1.0, 2.11, 1.0],
];

const MARK_W = 2.28;
const MARK_H = 1;

/* ------------------------------------------------------------------ tuning */

/** Frame budget: the foil is a material, not a game. 1.5 is the same cap the shader used. */
const DPR_CAP = 1.5;
/** One pass of the specular sweep, in ms. Constant velocity — this is a clock, not a breath. */
const SWEEP_PERIOD = 4200;
/** The seam line snaps once per beat of this clock. */
const SEAM_PERIOD = 900;
/** The pointer highlight lands on this grid instead of following the cursor continuously. */
const POINTER_GRID = 24;
/** A phone renders the foil as an ambient surface, per DESIGN.md §4. */
const AMBIENT_MAX_WIDTH = 768;

/** One frame at a fixed phase — the sweep resting across the mark under reduced motion. */
const STATIC_PHASE = SWEEP_PERIOD * 0.62;

/* ------------------------------------------------------------------ palette */

/*
 * Read from the design tokens at draw time rather than hard-coded, so a token change reaches the
 * canvas without editing this file. The fallbacks are the documented token values.
 */
const FALLBACK = {
  blue: "#0087ff",
  primary: "#ffffff",
  hairline: "rgb(255 255 255 / 0.16)",
};

function readToken(style: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = style.getPropertyValue(name).trim();
  return value.length > 0 ? value : fallback;
}

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
const RAMP_DESKTOP = ["#25282e", "#101216", "#1c1f25", "#08090b"] as const;
const RAMP_AMBIENT = ["#9aa1ab", "#3d434c", "#828a95", "#23272c"] as const;

/* ------------------------------------------------------------------ geometry helpers */

interface Layout {
  /** Left edge of the mark's box, in CSS px. */
  x: number;
  /** Top edge. */
  y: number;
  /** Size of one unit of stroke space, in CSS px. */
  unit: number;
}

function layoutFor(width: number, height: number): Layout {
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

function markPath(layout: Layout): Path2D {
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

/**
 * Build a one-pixel ring around the union of the strokes.
 *
 * The union matters: filling six quads into one path (nonzero winding) gives a solid silhouette,
 * and the ring is that silhouette dilated by one pixel minus itself. Stroking each quad instead —
 * which is what this file did first — prints every internal seam and reads as a wireframe, not as
 * a solid object with an edge.
 */
function buildRing(
  width: number,
  height: number,
  dpr: number,
  path: Path2D,
  offsets: readonly (readonly [number, number])[],
  colour: string,
  alpha: number,
): HTMLCanvasElement | null {
  const px = Math.max(1, Math.round(dpr));
  const w = Math.max(1, Math.round(width * px));
  const h = Math.max(1, Math.round(height * px));

  const mask = document.createElement("canvas");
  mask.width = w;
  mask.height = h;
  const maskCtx = mask.getContext("2d");
  if (!maskCtx) return null;
  maskCtx.setTransform(px, 0, 0, px, 0, 0);
  maskCtx.fillStyle = "#fff";
  maskCtx.fill(path);

  const ring = document.createElement("canvas");
  ring.width = w;
  ring.height = h;
  const ringCtx = ring.getContext("2d");
  if (!ringCtx) return null;
  for (const [dx, dy] of offsets) ringCtx.drawImage(mask, dx * px, dy * px);
  ringCtx.setTransform(1, 0, 0, 1, 0, 0);
  ringCtx.globalCompositeOperation = "destination-out";
  ringCtx.drawImage(mask, 0, 0);
  ringCtx.globalCompositeOperation = "source-in";
  ringCtx.globalAlpha = alpha;
  ringCtx.fillStyle = colour;
  ringCtx.fillRect(0, 0, w, h);
  return ring;
}

/* ------------------------------------------------------------------ the frame */

interface Palette {
  blue: string;
  primary: string;
  hairline: string;
}

interface Rims {
  outline: HTMLCanvasElement | null;
  blueRim: HTMLCanvasElement | null;
}

interface Frame {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  layout: Layout;
  path: Path2D;
  palette: Palette;
  rims: Rims;
  /** Wall clock of the animation, in ms. Frozen at one value under reduced motion. */
  time: number;
  /** Quantised pointer x in CSS px, or null when the pointer is away. */
  pointerX: number | null;
  /** `≤768px`: the layer is composited at .2, so the plate itself is drawn brighter. */
  ambient: boolean;
}

/*
 * The plate. Everything below is compositing inside a clip of the monogram, which is what makes a
 * flat 2D fill read as a solid object rather than a sticker: the base falls off top-to-bottom, the
 * grain runs perpendicular to the sweep, and the highlight is a *narrow* band whose leading edge is
 * harder than its tail.
 */
function drawFoil(frame: Frame) {
  const { ctx, width, height, layout, path, palette, rims, time, pointerX, ambient } = frame;
  ctx.clearRect(0, 0, width, height);
  if (layout.unit <= 0) return;

  const top = layout.y;
  const bottom = layout.y + MARK_H * layout.unit;
  const left = layout.x;
  const right = layout.x + MARK_W * layout.unit;

  ctx.save();
  ctx.clip(path);

  /* ---- the plate -------------------------------------------------------------- */
  const ramp = ambient ? RAMP_AMBIENT : RAMP_DESKTOP;
  const base = ctx.createLinearGradient(0, top, 0, bottom);
  base.addColorStop(0, ramp[0]);
  base.addColorStop(0.28, ramp[1]);
  base.addColorStop(0.62, ramp[2]);
  base.addColorStop(1, ramp[3]);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  /* ---- brushed grain: horizontal hairlines, 3 px apart, alternating alpha ------- */
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 1;
  for (let y = top; y <= bottom; y += 3) {
    const row = Math.round((y - top) / 3);
    ctx.globalAlpha = row % 2 === 0 ? 0.028 : ambient ? 0.09 : 0.055;
    ctx.beginPath();
    ctx.moveTo(left, y + 0.5);
    ctx.lineTo(right, y + 0.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  /* ---- the specular sweep ------------------------------------------------------
     A constant-velocity band. `phase` runs 0→1 over SWEEP_PERIOD and the gradient is built in
     absolute px so the *edges* stay crisp while the band crosses the plate. */
  const sweepWidth = layout.unit * 0.9;
  const travel = MARK_W * layout.unit + sweepWidth * 2;
  const phase = (time % SWEEP_PERIOD) / SWEEP_PERIOD;
  const sweepX = left - sweepWidth + travel * phase;

  const sweep = ctx.createLinearGradient(sweepX - sweepWidth, 0, sweepX + sweepWidth, 0);
  sweep.addColorStop(0, "rgba(255,255,255,0)");
  sweep.addColorStop(0.34, "rgba(255,255,255,0.09)");
  sweep.addColorStop(0.48, "rgba(255,255,255,0.66)");
  sweep.addColorStop(0.52, "rgba(255,255,255,0.80)");
  sweep.addColorStop(0.62, "rgba(255,255,255,0.12)");
  sweep.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sweep;
  ctx.fillRect(0, top, width, MARK_H * layout.unit);

  /* ---- the seam: a 1 px vertical line snapping on a fixed clock ---------------- */
  const seamStep = Math.floor(time / SEAM_PERIOD) % 9;
  const seamX = left + (right - left) * (0.08 + (seamStep / 8) * 0.84);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = palette.primary;
  ctx.fillRect(Math.round(seamX), top, 1, MARK_H * layout.unit);
  ctx.globalAlpha = 1;

  /* ---- pointer highlight, quantised to the plate grid ------------------------- */
  if (pointerX !== null) {
    const snapped = left + Math.round((pointerX - left) / POINTER_GRID) * POINTER_GRID;
    const lit = ctx.createLinearGradient(snapped - POINTER_GRID * 1.6, 0, snapped + POINTER_GRID * 1.6, 0);
    lit.addColorStop(0, "rgba(255,255,255,0)");
    lit.addColorStop(0.5, "rgba(255,255,255,0.26)");
    lit.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = lit;
    ctx.fillRect(0, top, width, MARK_H * layout.unit);
  }

  ctx.restore();

  /* ---- the edges: one hairline, one cold rim on the right --------------------- */
  if (rims.blueRim) ctx.drawImage(rims.blueRim, 0, 0, width, height);
  if (rims.outline) ctx.drawImage(rims.outline, 0, 0, width, height);
}

/* ------------------------------------------------------------------ the loop */

interface Host {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  layout: Layout;
  path: Path2D;
  palette: Palette;
  rims: Rims;
  pointerX: number | null;
  ambient: boolean;
}

export default function AnMonogramFoil() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const host = useRef<Host | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = hostRef.current;
    if (!canvas || !wrapper) return;

    /* `getContext("2d")` and nothing else. No GPU probe, no fallback context: a 2D context is
       available in every browser this site supports, which is the entire point of the migration. */
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const style = getComputedStyle(document.documentElement);
    const palette: Palette = {
      blue: readToken(style, "--color-signal-blue", FALLBACK.blue),
      primary: readToken(style, "--color-text-primary", FALLBACK.primary),
      hairline: readToken(style, "--color-hairline", FALLBACK.hairline),
    };

    const ambientQuery = window.matchMedia(`(max-width: ${AMBIENT_MAX_WIDTH}px)`);
    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const measure = () => {
      const rect = wrapper.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const layout = layoutFor(width, height);
      const path = markPath(layout);
      /* The rims are geometry, not animation: build them once per size, never per frame. */
      const rims: Rims = {
        outline: buildRing(width, height, dpr, path, RING_OFFSETS, palette.hairline, 1),
        blueRim: buildRing(width, height, dpr, path, RIGHT_OFFSETS, palette.blue, 0.55),
      };
      host.current = {
        ctx,
        width,
        height,
        layout,
        path,
        palette,
        rims,
        pointerX: host.current?.pointerX ?? null,
        ambient: ambientQuery.matches,
      };
      return host.current;
    };

    const render = (time: number) => {
      const current = host.current ?? measure();
      drawFoil({ ...current, time });
    };

    measure();

    /* The ambient state is written to the DOM, so "is this the ambient variant?" is a question a
       test can answer without recomputing the media query itself. */
    const applyAmbient = () => {
      wrapper.dataset.ambient = ambientQuery.matches ? "true" : "false";
      if (ambientQuery.matches && host.current) host.current.pointerX = null;
      /* Crossing the boundary changes the plate ramp, not just the CSS alpha: redraw the resting
         frame immediately so a reader who rotates a phone never sees a stale material. */
      if (host.current) host.current.ambient = ambientQuery.matches;
      render(reduceQuery.matches ? STATIC_PHASE : performance.now());
    };
    applyAmbient();
    ambientQuery.addEventListener("change", applyAmbient);

    let frame = 0;
    let running = false;
    let started = 0;

    /*
     * `drawFoil` takes an absolute clock: the sweep phase is `time % SWEEP_PERIOD` and the seam
     * steps on `floor(time / SEAM_PERIOD)`, so a monotonic timestamp is the whole state. No easing
     * accumulator, nothing to drift out of sync with a dropped frame — which is what makes the
     * motion read as mechanical rather than as a breath.
     */
    const tick = (now: number) => {
      if (!running) return;
      render(now);
      frame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || reduceQuery.matches) return;
      running = true;
      started = performance.now();
      frame = window.requestAnimationFrame(tick);
    };

    const stop = () => {
      running = false;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (ambientQuery.matches) return;
      if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      if (!host.current) return;
      const rect = wrapper.getBoundingClientRect();
      host.current.pointerX = event.clientX - rect.left;
      if (!running) render(reduceQuery.matches ? STATIC_PHASE : started + (performance.now() - started));
    };
    const onPointerLeave = () => {
      if (!host.current) return;
      host.current.pointerX = null;
      if (!running) render(STATIC_PHASE);
    };
    wrapper.addEventListener("pointermove", onPointerMove, { passive: true });
    wrapper.addEventListener("pointerleave", onPointerLeave);

    const resizeObserver = new ResizeObserver(() => {
      measure();
      render(reduceQuery.matches ? STATIC_PHASE : started > 0 ? started + (performance.now() - started) : STATIC_PHASE);
    });
    resizeObserver.observe(wrapper);

    const visibility = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) start();
        else stop();
      },
      { rootMargin: "0px", threshold: 0.01 },
    );
    visibility.observe(wrapper);

    /* The resting frame exists before the loop: the band is a printed plate at rest, and it is the
       only frame a reader who asked for reduced motion will ever see. */
    render(reduceQuery.matches ? STATIC_PHASE : performance.now());

    return () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
      ambientQuery.removeEventListener("change", applyAmbient);
      wrapper.removeEventListener("pointermove", onPointerMove);
      wrapper.removeEventListener("pointerleave", onPointerLeave);
      host.current = null;
    };
  }, []);

  return (
    <div ref={hostRef} className={styles.foil} data-foil-host="true">
      <canvas ref={canvasRef} className={styles.foilCanvas} data-foil="canvas" aria-hidden="true" />
    </div>
  );
}
