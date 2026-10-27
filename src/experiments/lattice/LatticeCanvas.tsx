"use client";

import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/effects/usePrefersReducedMotion";
import { latticeConfig } from "./lattice-config";
import { createLatticeRenderer, type FrameState } from "./lattice-renderer";

/** Time (seconds) used for the single static frame shown under reduced motion. */
const STATIC_TIME = 2.3;

/**
 * Owns the animation loop for the Lattice canvas.
 *
 * - Runs only while the canvas is on-screen and the tab is visible.
 * - Keeps all animation state in refs: no React state updates per frame.
 * - Under reduced motion, draws one static frame and redraws only on resize.
 * - Cleans up the loop, observers and listeners on unmount.
 */
export function LatticeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const renderer = createLatticeRenderer(canvas);
    const state: FrameState = { time: 0, yaw: 0 };
    // Pointer-driven yaw is eased toward its target; no React state involved.
    const pointer = { target: 0, current: 0 };

    let rafId = 0;
    let lastFrame = 0;
    let running = false;
    let inView = true;

    const measure = () => {
      const rect = host.getBoundingClientRect();
      renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    };

    const renderStatic = () => {
      renderer.draw({ time: STATIC_TIME, yaw: 0 });
    };

    const frame = (now: number) => {
      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, latticeConfig.maxStep) : 0;
      lastFrame = now;

      state.time += dt;
      // Exponential easing toward the pointer target; frame-rate independent.
      pointer.current += (pointer.target - pointer.current) * (1 - Math.exp(-dt * 6));
      // A slow idle drift keeps the object alive when no pointer is present.
      state.yaw = pointer.current + 0.12 * Math.sin(state.time * 0.15);

      renderer.draw(state);
      rafId = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      lastFrame = 0;
      rafId = requestAnimationFrame(frame);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(rafId);
    };

    const sync = () => {
      if (inView && !document.hidden) start();
      else stop();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      if (rect.width === 0) return;
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.target = Math.max(-1, Math.min(1, nx)) * latticeConfig.maxYaw;
    };

    measure();

    if (reducedMotion) {
      renderStatic();
      const onResize = () => {
        measure();
        renderStatic();
      };
      const observer = new ResizeObserver(onResize);
      observer.observe(host);
      return () => observer.disconnect();
    }

    renderer.draw(state);

    const resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(host);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? false;
      sync();
    });
    intersectionObserver.observe(canvas);

    const onVisibility = () => sync();
    document.addEventListener("visibilitychange", onVisibility);
    // Listen on window: the text layer sits above the canvas and would otherwise block events.
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    sync();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className="lattice-canvas" aria-hidden="true" />;
}
