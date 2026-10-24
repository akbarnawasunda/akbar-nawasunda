"use client";

import { useEffect } from "react";

import { snapPlate } from "./ink-plate";

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
 *
 * ## Why the offset is quantised (R11, performance)
 *
 * `text-shadow` is a *paint* property. Writing it to three decimal places sixty times a second
 * meant the hero's 14vw name — roughly two million device pixels of serif with a second glyph pass
 * for the plate — was re-drawn on every frame the pointer moved, and the plate's own easing kept it
 * re-drawing for another half second after the pointer stopped. That is the most expensive paint on
 * the site, and it was being triggered ~63 times for a movement the eye reads as one gesture.
 *
 * The offset is now snapped before it is written (see `./ink-plate` for the reasoning and the
 * arithmetic), and identical consecutive values are not written at all. The hero's plate moves in
 * whole pixels — fifteen distinct positions across a whole sweep instead of one per frame — so the
 * paint count drops by roughly an order of magnitude, the type gets sharper, and the easing is
 * unchanged: the plate still arrives smoothly, it just costs nothing while it travels between two
 * pixel positions.
 *
 * The easing itself is unchanged, so the plate still arrives smoothly; it just costs nothing while
 * it travels between two pixel positions.
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
    /** The last pair actually written, so a frame that lands on the same pixel writes nothing. */
    let writtenX = Number.NaN;
    let writtenY = Number.NaN;

    const write = (x: number, y: number) => {
      const sx = snapPlate(x);
      const sy = snapPlate(y);
      if (sx === writtenX && sy === writtenY) return;
      writtenX = sx;
      writtenY = sy;
      root.style.setProperty("--ink-x", sx.toFixed(3));
      root.style.setProperty("--ink-y", sy.toFixed(3));
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.09;
      currentY += (targetY - currentY) * 0.09;
      write(currentX, currentY);

      const settled = Math.abs(targetX - currentX) < 0.002 && Math.abs(targetY - currentY) < 0.002;
      if (settled) {
        currentX = targetX;
        currentY = targetY;
        write(targetX, targetY);
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
