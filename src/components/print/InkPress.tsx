"use client";

import { useEffect } from "react";

/**
 * The second plate.
 *
 * Every page on this site is now printed twice: once in ink, and once in a colour plate that sits a
 * few pixels off register. This component is the pressman — it writes one pair of numbers
 * (`--ink-x`, `--ink-y`, −1…1) onto the document element, and every `.ink` heading on the page reads
 * them through its `text-shadow`. Move the pointer and the whole site goes out of register together.
 *
 * Three deliberate limits:
 * - **It never runs without a pointer.** The listener ignores `pointerType === "touch"`, so a phone
 *   gets the flat print and pays nothing for a loop it cannot see.
 * - **It stops.** The rAF loop cancels itself once the plates have settled within 0.002 of the
 *   target, so an idle page runs no animation at all (MOTION_DESIGN.md: no endless decoration).
 * - **It bails under `prefers-reduced-motion` at mount**, before any listener is attached. The
 *   numbers stay 0, which is exactly the registered state — the type still carries its plate, at
 *   0 px offset, so nothing has to be hidden from anyone.
 *
 * `(hover: none)` is deliberately *not* used as the gate: headless Chromium reports it as true and
 * every pointer effect on the site silently switched itself off in QA. The event's own
 * `pointerType` is the honest signal.
 */
export function InkPress() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = 0;

    const tick = () => {
      currentX += (targetX - currentX) * 0.09;
      currentY += (targetY - currentY) * 0.09;
      root.style.setProperty("--ink-x", currentX.toFixed(3));
      root.style.setProperty("--ink-y", currentY.toFixed(3));

      const settled = Math.abs(targetX - currentX) < 0.002 && Math.abs(targetY - currentY) < 0.002;
      if (settled) {
        currentX = targetX;
        currentY = targetY;
        root.style.setProperty("--ink-x", targetX.toFixed(3));
        root.style.setProperty("--ink-y", targetY.toFixed(3));
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      targetX = (event.clientX / window.innerWidth) * 2 - 1;
      targetY = (event.clientY / window.innerHeight) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
