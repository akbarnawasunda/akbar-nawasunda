"use client";

import { useEffect, useRef } from "react";

import styles from "./AnMonogram.module.css";
import {
  buildPlates,
  layoutFor,
  markPath,
  type Palette,
  MARK_H,
  MARK_W,
  type Layout,
  type Plates,
  type SurfaceFactory,
} from "./foil-geometry";
import type { PlateResponse } from "./foil-plate.worker";

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

/* ------------------------------------------------------------------ tuning */

/** Frame budget: the foil is a material, not a game. 1.5 is the same cap the shader used. */
const DPR_CAP = 1.5;
/**
 * …but the ambient surface is drawn at 1:1 CSS pixels, and that is a measured decision.
 *
 * The loop blits the baked plate and the rim layer across the *whole* canvas every frame — two
 * full-surface passes at 30 Hz. At 390×844 with the 1.5 cap that is 585×938 = 548 720 px per blit,
 * 1.1 M px per frame. On a mid-range phone (390×844@3 with the CPU throttled 4×, FASE 4a) the band
 * could not hold the frame budget: 47.4 / 48.8 / 49.8 fps over three runs, against a 58.2 fps
 * ceiling measured with the loop switched off. Dropping the ambient backing store to 1.0 — 244 000
 * px, 2.25× less surface — restores it to 57.3 / 58.2 fps, which is the ceiling.
 *
 * It costs nothing visible, and the reason is in the design: this variant is composited at
 * `opacity: 0.2` over a black band and is deliberately a receding surface, so its edges are already
 * a soft gradient tens of pixels wide. Density beyond 1:1 buys nothing at 20 % alpha; it only buys
 * blits. The wide variant keeps `DPR_CAP`: there the mark is the subject, at full opacity.
 */
const AMBIENT_DPR_CAP = 1;
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

/* ------------------------------------------------------------------ the frame */

/*
 * The static half of every frame, baked once per size instead of once per frame.
 *
 * This is the whole difference between a missed and a met frame budget. `drawFoil` used to rebuild a
 * full-canvas four-stop gradient, stroke the brushed grain (one `stroke()` per 3 px — 195 of them at
 * 1440x666) and blit two full-canvas rim layers *every frame*, while the only things that actually
 * move are one soft band and a 1 px seam. Measured in `artifacts/scroll-perf-fix/`: freezing the
 * context but keeping the plate and the layer restored 60 fps, so the cost was never the composited
 * layer — it was re-deriving pixels that do not change.
 */
interface Frame {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  layout: Layout;
  path: Path2D;
  palette: Palette;
  plates: Plates;
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
  const { ctx, width, height, layout, path, palette, plates, time, pointerX } = frame;
  if (layout.unit <= 0) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  const top = layout.y;
  const markHeight = MARK_H * layout.unit;
  const left = layout.x;
  const right = layout.x + MARK_W * layout.unit;

  /* ---- the plate, one blit ----------------------------------------------------
     `copy` replaces the destination *including its alpha*, which is why the old
     `clearRect` is gone: one pass writes the whole static half of the frame. */
  if (!plates.base) {
    /* Nothing to composite yet (the worker is still rasterising). An empty canvas is honest: the
       baked still underneath stays visible instead of a plate-shaped hole. */
    ctx.clearRect(0, 0, width, height);
    return;
  }
  if (plates.base) {
    ctx.globalCompositeOperation = "copy";
    ctx.drawImage(plates.base, 0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  ctx.save();
  ctx.clip(path);

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
  /* Only the band's own box. Both gradient ends are `rgba(255,255,255,0)`, so filling the full
     width paints exactly the same pixels — it just makes Skia touch the whole plate every frame
     instead of the strip that carries the highlight. */
  ctx.fillRect(sweepX - sweepWidth, top, sweepWidth * 2, markHeight);

  /* ---- the seam: a 1 px vertical line snapping on a fixed clock ---------------- */
  const seamStep = Math.floor(time / SEAM_PERIOD) % 9;
  const seamX = left + (right - left) * (0.08 + (seamStep / 8) * 0.84);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = palette.primary;
  ctx.fillRect(Math.round(seamX), top, 1, markHeight);
  ctx.globalAlpha = 1;

  /* ---- pointer highlight, quantised to the plate grid ------------------------- */
  if (pointerX !== null) {
    const snapped = left + Math.round((pointerX - left) / POINTER_GRID) * POINTER_GRID;
    const reach = POINTER_GRID * 1.6;
    const lit = ctx.createLinearGradient(snapped - reach, 0, snapped + reach, 0);
    lit.addColorStop(0, "rgba(255,255,255,0)");
    lit.addColorStop(0.5, "rgba(255,255,255,0.26)");
    lit.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = lit;
    ctx.fillRect(snapped - reach, top, reach * 2, markHeight);
  }

  ctx.restore();

  /* ---- the edges: one hairline, one cold rim on the right --------------------- */
  if (plates.rims) ctx.drawImage(plates.rims, 0, 0, width, height);
}

/* ------------------------------------------------------------------ the loop */

interface Host {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  layout: Layout;
  path: Path2D;
  palette: Palette;
  plates: Plates;
  pointerX: number | null;
  ambient: boolean;
  dpr: number;
}

export default function AnMonogramFoil({ onPainted }: { onPainted?: (painted: boolean) => void } = {}) {
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

    /*
     * ------------------------------------------------------------------ building the plates
     *
     * `buildPlates` rasterises 195 clipped strokes. Chromium records those commands and rasterises
     * them lazily, so the builder returns in ~3 ms and the real bill — measured at 50–62 ms for one
     * 1440×666 plate — arrives at the first draw that reads the canvas back. That bill used to land
     * here, on the main thread, at the exact moment the reader first scrolled.
     *
     * So the work goes to `foil-plate.worker.ts`, which owns an `OffscreenCanvas` and sends back an
     * already-rasterised `ImageBitmap`. The main thread only blits. If a worker cannot be built (old
     * engine, blocked, no `OffscreenCanvas`) the same builder runs inline: the band is never left
     * without its material, it is just slower to arrive.
     */
    const domSurface: SurfaceFactory = (w, h) => {
      const surface = document.createElement("canvas");
      surface.width = w;
      surface.height = h;
      return surface;
    };

    let worker: Worker | null = null;
    let requestId = 0;
    let paintedOnce = false;
    /*
     * `painted` is a level, not an edge: it drops back to false the moment a resize throws the plates
     * away, so the still underneath returns instead of leaving the band empty for the ~100 ms the
     * worker needs to rasterise the new size.
     */
    const reportPainted = (painted: boolean) => {
      if (painted === paintedOnce) return;
      paintedOnce = painted;
      onPainted?.(painted);
    };

    const requestPlates = (width: number, height: number, dpr: number): Plates => {
      const ambient = ambientQuery.matches;
      reportPainted(false);
      if (typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined") {
        try {
          worker ??= new Worker(new URL("./foil-plate.worker.ts", import.meta.url));
          worker.onmessage = (event: MessageEvent<PlateResponse>) => {
            const current = host.current;
            if (!current || event.data.id !== requestId) return;
            current.plates = { base: event.data.base, rims: event.data.rims };
            render(reduceQuery.matches ? STATIC_PHASE : performance.now());
          };
          const id = ++requestId;
          worker.postMessage({ id, width, height, dpr, ambient, palette });
          /* Nothing to draw until the bitmaps land; the baked still is still on screen underneath. */
          return { base: null, rims: null };
        } catch {
          worker = null;
        }
      }
      return buildPlates(domSurface, width, height, dpr, ambient, palette).plates;
    };

    const measure = () => {
      const rect = wrapper.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, ambientQuery.matches ? AMBIENT_DPR_CAP : DPR_CAP);
      /*
       * `ResizeObserver` fires once the moment it starts watching an element, so without this guard
       * the mount built the whole plate twice, back to back, for byte-identical surfaces — measured
       * at +41 ms of pure waste. Same size, same dpr, same ramp means the plates on the host are
       * still the right ones.
       */
      if (
        host.current &&
        host.current.width === width &&
        host.current.height === height &&
        host.current.dpr === dpr &&
        host.current.ambient === ambientQuery.matches
      ) {
        return host.current;
      }

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const previous = host.current;
      host.current = {
        ctx,
        width,
        height,
        dpr,
        layout: layoutFor(width, height),
        path: markPath(layoutFor(width, height)),
        palette,
        plates: { base: null, rims: null },
        pointerX: previous?.pointerX ?? null,
        ambient: ambientQuery.matches,
      };
      host.current.plates = requestPlates(width, height, dpr);
      return host.current;
    };

    const render = (time: number) => {
      const current = host.current ?? measure();
      drawFoil({ ...current, time });
      reportPainted(current.plates.base !== null);
    };

    measure();

    /* The ambient state is written to the DOM, so "is this the ambient variant?" is a question a
       test can answer without recomputing the media query itself. */
    const applyAmbient = () => {
      wrapper.dataset.ambient = ambientQuery.matches ? "true" : "false";
      if (ambientQuery.matches && host.current) host.current.pointerX = null;
      /* Crossing the boundary selects a different ramp, and the ramp is baked into the plate now:
         rebuild it rather than pretending the old one will do, then redraw the resting frame so a
         reader who rotates a phone never sees a stale material. */
      if (host.current && host.current.ambient !== ambientQuery.matches) measure();
      else if (host.current) host.current.ambient = ambientQuery.matches;
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
    /*
     * Half rate, on purpose. The sweep crosses the plate at 569 px/s, so at 30 Hz the highlight
     * steps ~19 px per frame — underneath the resolution of a soft gradient whose edges are already
     * 500 px wide. What it buys is the scroll: the frame loop and the scroll engine share one main
     * thread, and this hands half of the drawing budget back to the reader.
     */
    const FRAME_INTERVAL = 1000 / 30;
    let lastPaint = Number.NEGATIVE_INFINITY;

    const tick = (now: number) => {
      if (!running) return;
      if (now - lastPaint >= FRAME_INTERVAL - 1) {
        lastPaint = now;
        render(now);
      }
      frame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || reduceQuery.matches) return;
      running = true;
      lastPaint = Number.NEGATIVE_INFINITY;
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
      worker?.terminate();
      worker = null;
      resizeObserver.disconnect();
      visibility.disconnect();
      ambientQuery.removeEventListener("change", applyAmbient);
      wrapper.removeEventListener("pointermove", onPointerMove);
      wrapper.removeEventListener("pointerleave", onPointerLeave);
      host.current = null;
    };
    /*
     * `onPainted` is in the list because the effect has to stay honest about what it closes over — a
     * caller must memoise it (`AnMonogram` does, with `useCallback`), otherwise every parent render
     * would tear the foil down and rebuild the plates.
     */
  }, [onPainted]);

  return (
    <div ref={hostRef} className={styles.foil} data-foil-host="true">
      <canvas ref={canvasRef} className={styles.foilCanvas} data-foil="canvas" aria-hidden="true" />
    </div>
  );
}
