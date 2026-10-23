"use client";

import { useEffect, useRef } from "react";

import styles from "./CursorDot.module.css";

/**
 * Cursor companion: an 8px dot that tracks the pointer exactly and a 40px ring that lerps behind it.
 *
 * Three rules keep this from becoming a toy:
 * - it only mounts on `(hover: hover) and (pointer: fine)`, so a phone never pays for it;
 * - it is skipped entirely under `prefers-reduced-motion: reduce`;
 * - the native cursor stays visible — this is an accent, not a replacement, so the page is still
 *   usable if the script never runs.
 */
export function CursorDot() {
  const dot = useRef<HTMLSpanElement | null>(null);
  const ring = useRef<HTMLSpanElement | null>(null);
  const enabled = useRef(false);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || calm.matches) return;

    enabled.current = true;
    document.documentElement.dataset.cursor = "on";

    let targetX = 0;
    let targetY = 0;
    let ringX = 0;
    let ringY = 0;
    let frame = 0;

    const loop = () => {
      ringX += (targetX - ringX) * 0.15;
      ringY += (targetY - ringY) * 0.15;
      if (dot.current) dot.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      frame = requestAnimationFrame(loop);
    };

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      const interactive = (event.target as Element | null)?.closest("a, button, [role='button']");
      ring.current?.classList.toggle(styles.over ?? "cursor-over", Boolean(interactive));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      delete document.documentElement.dataset.cursor;
    };
  }, []);

  return (
    <>
      <span ref={dot} className={styles.dot} aria-hidden="true" />
      <span ref={ring} className={styles.ring} aria-hidden="true" />
    </>
  );
}
