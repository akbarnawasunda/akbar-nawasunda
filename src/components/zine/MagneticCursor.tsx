"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import styles from "./MagneticCursor.module.css";

/**
 * The magnetic cursor — round 31, owner's "wow" B: a dot and a ring replace the system pointer on
 * mouse input; near a link or a button the ring leaves the hand and snaps to the object, scaled to
 * it, like a magnet finding steel.
 *
 * How it stays cheap and honest:
 * - no rAF loop. `pointermove` writes two `transform: translate3d(...)` styles and CSS transitions
 *   provide the lag — the ring trails at 180 ms, the dot at 50 ms;
 * - no layout reads in the hot path. The target's rect is measured once, on `pointerover`, and
 *   reused by every move until the pointer leaves;
 * - touch never sees it: the first `pointermove` with `pointerType === "mouse"` is what arms the
 *   component (the contract forbids hover media queries; the event knows);
 * - reduced motion never sees it either, and `cursor: none` only applies while the replacement is
 *   actually on screen (`html[data-cursor="on"]`).
 */
export function MagneticCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let rect: DOMRect | null = null;

    const onOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target = event.target instanceof Element ? event.target : null;
      const interactive = target?.closest("a, button, [data-magnetic]");
      rect = interactive ? interactive.getBoundingClientRect() : null;
      const ring = ringRef.current;
      if (ring) ring.dataset.state = interactive ? "lock" : "free";
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (!armed) setArmed(true);
      const dot = dotRef.current;
      const ring = ringRef.current;
      if (!dot || !ring) return;
      dot.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      if (rect && ring.dataset.state === "lock") {
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const scale = Math.min(2.6, Math.max(1.15, Math.max(rect.width, rect.height) / 44));
        ring.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale})`;
      } else {
        ring.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%) scale(1)`;
      }
    };

    const onOut = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("a, button, [data-magnetic]")) {
        rect = null;
        const ring = ringRef.current;
        if (ring) ring.dataset.state = "free";
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerout", onOut, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerout", onOut);
      delete document.documentElement.dataset.cursor;
    };
  }, [armed]);

  useEffect(() => {
    if (armed) document.documentElement.dataset.cursor = "on";
  }, [armed]);

  if (!armed || typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.cursor} aria-hidden="true">
      <div ref={ringRef} className={styles.ring} data-state="free" />
      <div ref={dotRef} className={styles.dot} />
    </div>,
    document.body,
  );
}
