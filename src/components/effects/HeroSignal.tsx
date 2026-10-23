"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { shouldAnimate } from "./liquid-signal/geometry";
import type { LiquidSignalHandle } from "./liquid-signal/renderer";
import styles from "./HeroSignal.module.css";

interface HeroSignalProps {
  /**
   * The static field, server-rendered. It is not a placeholder: it stays in the page and is what
   * everyone sees before (or instead of) WebGL.
   */
  children: ReactNode;
  className?: string;
}

/**
 * Progressive enhancement around the Liquid Signal.
 *
 * The inline SVG field renders on the server, so the hero is complete with JS disabled, on a slow
 * connection, and for anyone who asks for reduced motion. Only after the page has loaded *and* the
 * main thread goes idle does this bring in the WebGL renderer — a separate chunk, so it cannot delay
 * the LCP portrait. If the context is missing, a shader fails, or the device cannot hold 30 fps for
 * two seconds, the canvas is removed and the SVG simply stays: no error state, no layout shift.
 */
export function HeroSignal({ children, className }: HeroSignalProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<"static" | "live" | "failed">("static");

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Cheap API check before the import: no point downloading the renderer for a browser that
    // cannot create a context at all. The real context is created later, on the real canvas.
    const hasWebGL = typeof window.WebGLRenderingContext !== "undefined";
    // Visibility is handled below (pause/resume), not here: a page opened in a background tab
    // should still get the field once the visitor looks at it.
    if (!shouldAnimate({ reducedMotion, hasWebGL })) return;

    let disposed = false;
    let handle: LiquidSignalHandle | null = null;
    let idleHandle = 0;
    let timeoutHandle = 0;
    let visible = true;

    const start = async () => {
      if (disposed || !visible) return;
      try {
        const { createLiquidSignal } = await import("./liquid-signal/renderer");
        if (disposed || !visible) return;

        handle = createLiquidSignal(canvas, {
          onFirstFrame: () => {
            if (!disposed) setState("live");
          },
          onFail: () => {
            if (!disposed) setState("failed");
          },
        });
        if (!handle) setState("failed");
      } catch (error) {
        // A blocked chunk, a driver that throws instead of returning null — either way the static
        // field is already on screen, so this only has to stay quiet.
        console.warn("[liquid-signal] renderer unavailable:", error);
        if (!disposed) setState("failed");
      }
    };

    const schedule = () => {
      // requestIdleCallback is not in Safari before 17; the timeout fallback keeps behaviour equal.
      const idle = window.requestIdleCallback;
      if (typeof idle === "function") {
        idleHandle = idle(() => void start(), { timeout: 1200 });
      } else {
        timeoutHandle = window.setTimeout(() => void start(), 300);
      }
    };

    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });

    // Pause offscreen and in background tabs: an invisible canvas should not hold the GPU awake.
    const intersection = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        handle?.setPaused(!visible);
      },
      { threshold: 0.01 },
    );
    intersection.observe(host);

    const onVisibilityChange = () => {
      handle?.setPaused(document.visibilityState !== "visible");
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      window.removeEventListener("load", schedule);
      const cancelIdle = window.cancelIdleCallback;
      if (typeof cancelIdle === "function" && idleHandle) cancelIdle(idleHandle);
      if (timeoutHandle) window.clearTimeout(timeoutHandle);
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      handle?.dispose();
      handle = null;
    };
  }, []);

  return (
    <div ref={hostRef} className={className ? `${styles.host} ${className}` : styles.host} data-signal-state={state}>
      {children}
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
    </div>
  );
}
