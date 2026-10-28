"use client";

import { useEffect, useRef } from "react";

import styles from "./AnMonogramFoil.module.css";

/**
 * The AN monogram as a canvas-2D "metalmark foil".
 *
 * Round 34: the WebGL liquid monogram is replaced. The diagnosis is in
 * `artifacts/visual-check/mercury-core/DIAGNOSIS.md`: the WebGL path never rendered in any
 * environment without a working GPU — this sandbox has no WebGL at all (12 backend combos failed)
 * — and where it did render it cost 21,312 noise-function evaluations per frame (2,664 vertices ×
 * 8 noise calls) plus a 96³ cube-environment bake, on a 973 KB three/fiber/drei chunk.
 *
 * This is the same AN monogram — the same six extruded stroke quads, the same silhouette — drawn
 * with canvas 2D: flat bone fill, one signal-blue edge (the site's existing misregistered-print
 * device), and a single mechanical highlight sweep. No WebGL, no shader, no three, no GPU. The
 * baked WebP still underneath stays in the DOM as the no-JS / reduced-motion / no-canvas fallback.
 *
 * Motion is deliberately mechanical, not organic: a one-shot diagonal sweep on mount, then the
 * mark sits still (scroll parallax stays with the existing `Depth` layer). On desktop the sweep
 * position snaps to the pointer's x with a mechanical lerp — the mark reads the hand, it does not
 * float away from it. Density is six strokes, not a particle field.
 *
 * The rAF loop is parked by an IntersectionObserver: when the band leaves the viewport the loop
 * stops, so nothing is drawn while the reader is elsewhere.
 */

type Quad = readonly [number, number, number, number, number, number, number, number];

/** The six stroke quads of the AN monogram, in a 0..2.28 × 0..1 box (N offset by 1.28). */
const STROKES: readonly Quad[] = [
  // A — left leg, right leg, crossbar
  [0.0, 0.0, 0.17, 0.0, 0.57, 1.0, 0.4, 1.0],
  [0.83, 0.0, 1.0, 0.0, 0.6, 1.0, 0.43, 1.0],
  [0.24, 0.34, 0.76, 0.34, 0.7, 0.5, 0.3, 0.5],
  // N — left upright, diagonal, right upright
  [1.28, 0.0, 1.45, 0.0, 1.45, 1.0, 1.28, 1.0],
  [1.28, 1.0, 1.46, 1.0, 2.28, 0.0, 2.1, 0.0],
  [2.11, 0.0, 2.28, 0.0, 2.28, 1.0, 2.11, 1.0],
];

const SWEEP_MS = 900;
/** The misregistered-print offset, in CSS px — the one blue edge on the mark. */
const EDGE_OFFSET = 0.6;

export default function AnMonogramFoil() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return; // no 2d canvas: the still underneath stays visible

    let raf = 0;
    let inView = false;
    let disposed = false;
    let sweep = 1;
    let sweepTarget = 1;
    let pointerOver = false;
    let sweepStart = 0;

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      if (!inView || disposed) return;
      raf = requestAnimationFrame(draw);
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const pad = Math.min(rect.width, rect.height) * 0.09;
      const scale = Math.min(
        (rect.width - pad * 2) / 2.28,
        (rect.height - pad * 2) / 1.0,
      );
      const ox = (rect.width - 2.28 * scale) / 2;
      // Shift the mark up slightly so its optical top sits closer to the logistics strip above.
      const oy = pad + (rect.height - pad * 2 - scale) / 2 - rect.height * 0.02;
      const toX = (x: number) => ox + x * scale;
      const toY = (y: number) => oy + (1 - y) * scale;

      ctx.clearRect(0, 0, rect.width, rect.height);

      // --- the mark: six bone-filled strokes, and the same six offset for the accent edge
      const mark = new Path2D();
      const edge = new Path2D();
      for (const [x1, y1, x2, y2, x3, y3, x4, y4] of STROKES) {
        mark.moveTo(toX(x1), toY(y1));
        mark.lineTo(toX(x2), toY(y2));
        mark.lineTo(toX(x3), toY(y3));
        mark.lineTo(toX(x4), toY(y4));
        mark.closePath();
        edge.moveTo(toX(x1) + EDGE_OFFSET, toY(y1) + EDGE_OFFSET);
        edge.lineTo(toX(x2) + EDGE_OFFSET, toY(y2) + EDGE_OFFSET);
        edge.lineTo(toX(x3) + EDGE_OFFSET, toY(y3) + EDGE_OFFSET);
        edge.lineTo(toX(x4) + EDGE_OFFSET, toY(y4) + EDGE_OFFSET);
        edge.closePath();
      }

      ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
      ctx.fill(mark);

      // --- one accent edge, misregistered down-right (the site's existing device)
      ctx.strokeStyle = "rgba(0, 135, 255, 0.5)";
      ctx.lineWidth = Math.max(1, scale * 0.012);
      ctx.stroke(edge);

      // --- the mechanical highlight sweep
      sweep += (sweepTarget - sweep) * 0.12;
      const t = Math.min(1, (now - sweepStart) / SWEEP_MS);
      const s = t < 1 ? 1 - Math.pow(1 - t, 3) : sweep;
      const alpha = t < 1 ? 0.4 * Math.sin(Math.PI * s) : pointerOver ? 0.15 : 0;

      const markW = 2.28 * scale;
      const markH = scale;
      const cx = ox + s * markW;
      const cy = oy + markH / 2;
      const bandW = Math.max(8, markW * 0.2);

      if (alpha > 0) {
        /* The sweep is a travelling band of light, clipped to the mark. `lighter` is what makes it
           visible at all: the bone underneath is already white, so compositing white over it with
           `source-atop` leaves the pixels byte-identical — adding to the press-opacity instead lifts
           those pixels from 0.82 to full, which reads as the foil catching the light. `mark` is the
           clip, which is why the band never bleeds onto the dark surround around the glyphs. */
        const nx = Math.SQRT1_2;
        const ny = -Math.SQRT1_2;
        const grad = ctx.createLinearGradient(
          cx + nx * bandW, cy + ny * bandW,
          cx - nx * bandW, cy - ny * bandW,
        );
        grad.addColorStop(0, "rgba(255, 255, 255, 0)");
        grad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha})`);
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.clip(mark);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.restore();
      }
    };

    const start = () => {
      if (disposed || inView) return;
      inView = true;
      sweepStart = performance.now();
      sweep = 0;
      sweepTarget = 1;
      raf = requestAnimationFrame(draw);
      // Mark the canvas so the still underneath fades out — the foil has drawn its first frame.
      canvas.dataset.foil = "on";
    };
    const stop = () => {
      inView = false;
      cancelAnimationFrame(raf);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) start();
        else stop();
      },
      { rootMargin: "0px" },
    );
    observer.observe(canvas);

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      sweepTarget = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    };
    const onPointerEnter = () => {
      pointerOver = true;
    };
    const onPointerLeave = () => {
      pointerOver = false;
    };
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerenter", onPointerEnter);
    canvas.addEventListener("pointerleave", onPointerLeave);

    const onResize = () => {
      size();
    };
    window.addEventListener("resize", onResize);
    size();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerenter", onPointerEnter);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.foil} aria-hidden="true" />;
}
