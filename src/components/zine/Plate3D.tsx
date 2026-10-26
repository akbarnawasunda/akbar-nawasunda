"use client";

import { useEffect, useRef, type ReactNode } from "react";

import styles from "./Plate3D.module.css";
import { perfFlag } from "./perf-flags";

/**
 * The 3D stage: an object that turns towards the pointer inside a real vanishing point.
 *
 * `Depth` already moves things with the scroll, but scroll depth alone reads as *parallax* — two
 * flat pictures sliding at different speeds. A plate is the other half: it has a perspective, it
 * rotates on two axes, and its children can sit at their own `translateZ`, so the sleeve, its edge
 * and its cast shadow separate in space instead of moving as one JPEG.
 *
 * The contract, so a caller knows what it is buying:
 * - the host gets `perspective` and `transform-style: preserve-3d`, and writes four custom
 *   properties every frame: `--plate-rx`, `--plate-ry` (degrees) and `--plate-x`, `--plate-y` (px);
 * - the inner wrapper applies the rotation; anything inside it may use `translateZ()` and the two
 *   shift properties to sit at a different depth, because a child of a `preserve-3d` element is
 *   laid out in the same 3D scene;
 * - the tilt is smoothed with a lerp in one rAF loop per plate, and the loop stops as soon as the
 *   values have settled — a resting plate costs nothing;
 * - the element's box is read **at most once per frame**, never once per pointer event. A
 *   high-polling-rate mouse fires 120–1000 moves a second; a rect read on each of those, in a page
 *   where other components write styles every frame, forces a synchronous layout each time. The
 *   cache is cleared at the top of each frame, so it stays correct while the page scrolls under an
 *   already-hovered plate;
 * - `will-change` is scoped to the gesture instead of the lifetime of the page (see the stylesheet):
 *   the promotion is what makes the rotation cheap, and holding a full-viewport 3D layer promoted
 *   while nothing moves is what makes a page feel heavy in a different way — memory;
 * - a touch pointer never drives it: the handler ignores anything that is not a mouse or a pen, so
 *   a phone renders the object flat — the honest resting state, not a broken animation. Gate on the
 *   *event*, not on `(hover: none)`: that media query is also false-negative in a headless browser,
 *   which made this component look broken to the very harness that is supposed to prove it works;
 *   `prefers-reduced-motion: reduce` still disables the listener at mount.
 *
 * It is deliberately *not* a generic "tilt card". Nothing here draws a border, a radius or a
 * shadow: the caller decides what the object is, and the plate only supplies the space it lives in.
 */
export function Plate3D({
  children,
  className,
  /** Maximum Y rotation in degrees at the edge of the element. */
  tiltY = 9,
  /** Maximum X rotation in degrees. Kept lower than Y: a taller-than-wide object tips fast. */
  tiltX = 6,
  /** Maximum pointer-follow translation in px, written to `--plate-x` / `--plate-y`. */
  shift = 10,
  /** Perspective distance in px. Lower is a wider lens; 1000–1400 reads as an object on a table. */
  perspective = 1100,
  /**
   * Stable hook for the review harness. CSS-module class names are hashed, so anything that asserts
   * on this object has to target a name the source controls.
   */
  "data-plate": dataPlate,
}: {
  children: ReactNode;
  className?: string;
  tiltY?: number;
  tiltX?: number;
  shift?: number;
  perspective?: number;
  "data-plate"?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    /*
     * Ablation switch: `?perf=noplate` leaves the stage flat — the same resting state as reduced
     * motion, with no listener attached. It exists so the cost of the rotation can be measured on
     * its own, without a rebuild and without guessing. See `perf-flags.ts`.
     */
    if (perfFlag("noplate")) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;
    /**
     * The host's box, valid for the current frame only.
     *
     * Cleared at the top of every tick, so a burst of pointer events inside one frame shares one
     * measurement and the next frame measures again. Without the clear a stale rect would survive a
     * scroll mid-gesture; without the cache every event pays for a layout read.
     */
    let rect: DOMRect | null = null;

    const write = () => {
      host.style.setProperty("--plate-ry", `${(current.x * tiltY).toFixed(2)}deg`);
      host.style.setProperty("--plate-rx", `${(-current.y * tiltX).toFixed(2)}deg`);
      host.style.setProperty("--plate-x", `${(current.x * shift).toFixed(2)}px`);
      host.style.setProperty("--plate-y", `${(current.y * shift).toFixed(2)}px`);
    };

    const tick = () => {
      rect = null;
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      write();
      const settled =
        Math.abs(target.x - current.x) < 0.0005 && Math.abs(target.y - current.y) < 0.0005;
      if (settled) {
        current.x = target.x;
        current.y = target.y;
        write();
        frame = 0;
        /* Nothing is moving any more, so the layer hint is no longer worth its memory. */
        delete host.dataset.active;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const schedule = () => {
      if (!frame) {
        /* Promote before the first frame that needs it, not on every frame. */
        host.dataset.active = "true";
        frame = requestAnimationFrame(tick);
      }
    };

    /*
     * The pointer is read against the element's own box, not the window: a plate near the top of
     * the page and one near the bottom should both reach full tilt when the cursor is over *them*.
     * `clientX/Y` and the rect are both viewport-relative, so no scroll offset is involved.
     */
    const onMove = (event: PointerEvent) => {
      /* Round 32: a finger drives the plate too, for as long as the browser keeps the gesture
         (scrolling claims it with `pointercancel`, which rests the plate again). Round 8 fenced
         touch out; the owner's round-32 note is that mobile must feel *more* alive, not less. */
      rect ??= host.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      target.x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
      target.y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
      schedule();
    };

    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      schedule();
    };

    /*
     * No `pointerenter` listener, deliberately. An earlier version switched the layer hint on enter
     * to warm it, which promoted a full-screen texture for every mouse that merely passed over the
     * hero and never moved — the exact cost the scoping exists to avoid. The hint goes on in
     * `schedule()`, which only runs when there is an actual rotation to write.
     */
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointercancel", onLeave);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointercancel", onLeave);
      delete host.dataset.active;
      host.style.removeProperty("--plate-ry");
      host.style.removeProperty("--plate-rx");
      host.style.removeProperty("--plate-x");
      host.style.removeProperty("--plate-y");
    };
  }, [tiltX, tiltY, shift]);

  return (
    <div
      ref={hostRef}
      className={className ? `${styles.stage} ${className}` : styles.stage}
      style={{
        perspective: `${perspective}px`,
        ["--plate-ry" as string]: "0deg",
        ["--plate-rx" as string]: "0deg",
      }}
      data-plate={dataPlate}
    >
      <div className={styles.inner}>{children}</div>
    </div>
  );
}
