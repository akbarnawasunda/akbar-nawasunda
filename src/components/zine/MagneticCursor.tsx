"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import styles from "./MagneticCursor.module.css";

/**
 * The magnetic cursor — round 31, owner's "wow" B: a dot and a ring replace the system pointer on
 * mouse input; near a link or a button the ring leaves the hand and snaps to the object, scaled to
 * it, like a magnet finding steel.
 *
 * Round 35 — the "mouse nge-bug" round. Four faults, all of them fixed here:
 *
 *   1. **It could swallow clicks.** The overlay is a full-viewport fixed layer. Its children already
 *      inherited `pointer-events: none`, but "inherited" is one refactor away from "blocking every
 *      link on the site". The stylesheet now says `pointer-events: none !important` on the layer
 *      *and* on both shapes, so no future rule can put the cursor back in front of the hand.
 *   2. **Touch could arm it.** Arming used to depend only on the *first* mouse move, and a hybrid
 *      device (touchscreen laptop, Android with a stylus) could leave a ring floating under a finger
 *      with no way to type. Any `pointerType === "touch"` now disarms the whole thing, removes the
 *      `data-cursor` flag from `<html>` and hands the native pointer straight back.
 *   3. **The listener was rebuilt on every arm.** The effect depended on `armed` state, so the first
 *      mouse move tore down and re-registered three window listeners mid-gesture — a dropped frame
 *      exactly when the hand is fastest. Arming is a ref now; the effect mounts once.
 *   4. **Two writes per pointer event.** `pointermove` can fire faster than the compositor can
 *      present (120 Hz mice report 1000 times a second). Moves are coalesced into one
 *      `requestAnimationFrame` write, and the magnetic rect is measured on `pointerover` only.
 *
 * The dot has no transition: it is the pointer, and a pointer that lags is the bug. The ring keeps
 * a short trail — that lag is the effect — and its transition is pure CSS, so the browser's
 * compositor owns it and no JavaScript runs between frames.
 */
export function MagneticCursor() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const armedRef = useRef(false);
  const frameRef = useRef(0);
  const pointRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef<HTMLElement | null>(null);
  /* The locked target's box, measured once on `pointerover` — never inside the paint. A
     `getBoundingClientRect()` per frame is a forced synchronous layout, which is exactly the kind of
     work that makes a custom cursor feel like it is dragging the rest of the page with it. */
  const rectRef = useRef<DOMRect | null>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const setFlag = (on: boolean) => {
      if (on) document.documentElement.dataset.cursor = "on";
      else delete document.documentElement.dataset.cursor;
    };

    const disarm = () => {
      if (!armedRef.current) {
        setFlag(false);
        return;
      }
      armedRef.current = false;
      targetRef.current = null;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      setFlag(false);
      setArmed(false);
    };

    /* One write per presented frame: both shapes are moved from the last known coordinate. */
    const paint = () => {
      frameRef.current = 0;
      const dot = dotRef.current;
      const ring = ringRef.current;
      const { x, y } = pointRef.current;
      if (!dot || !ring || !Number.isFinite(x) || !Number.isFinite(y)) return;

      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;

      const target = targetRef.current;
      const rect = rectRef.current;
      if (target && target.isConnected && rect) {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const scale = Math.min(2.6, Math.max(1.15, Math.max(rect.width, rect.height) / 44));
        ring.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%) scale(${scale})`;
      } else {
        targetRef.current = null;
        rectRef.current = null;
        ring.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(1)`;
      }
    };

    const schedule = () => {
      if (!frameRef.current) frameRef.current = requestAnimationFrame(paint);
    };

    const onMove = (event: PointerEvent) => {
      /* Touch hands the pointer straight back — permanently, for this session. A finger has no
         hover state to decorate, and a ring left behind a tap is the "mouse patah-patah" report. */
      if (event.pointerType === "touch") {
        disarm();
        return;
      }
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;

      const x = event.clientX;
      const y = event.clientY;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      pointRef.current = { x, y };
      if (!armedRef.current) {
        armedRef.current = true;
        setFlag(true);
        setArmed(true);
      }
      schedule();
    };

    const onOver = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const target = event.target instanceof Element ? event.target : null;
      const interactive = target?.closest<HTMLElement>("a, button, [data-magnetic]") ?? null;
      targetRef.current = interactive;
      rectRef.current = interactive ? interactive.getBoundingClientRect() : null;
      const ring = ringRef.current;
      if (ring) ring.dataset.state = interactive ? "lock" : "free";
      schedule();
    };

    const onOut = (event: PointerEvent) => {
      const related = event.relatedTarget instanceof Element ? event.relatedTarget : null;
      /* Moving between a link's own children (an icon inside an anchor) is not leaving the link. */
      if (targetRef.current && related && targetRef.current.contains(related)) return;
      targetRef.current = null;
      rectRef.current = null;
      const ring = ringRef.current;
      if (ring) ring.dataset.state = "free";
      schedule();
    };

    /* A locked rect goes stale the moment the page scrolls under it. Dropping the lock on scroll is
       cheaper and more honest than re-measuring every frame. */
    const onScroll = () => {
      targetRef.current = null;
      rectRef.current = null;
      const ring = ringRef.current;
      if (ring) ring.dataset.state = "free";
    };

    /* Leaving the window parks both shapes instead of leaving them frozen mid-screen. */
    const onLeave = () => {
      const root = rootRef.current;
      if (root) root.dataset.hidden = "true";
    };
    const onEnter = () => {
      const root = rootRef.current;
      if (root) delete root.dataset.hidden;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerout", onOut, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerenter", onEnter);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerout", onOut);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerenter", onEnter);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      armedRef.current = false;
      setFlag(false);
    };
  }, []);

  if (!armed || typeof document === "undefined") return null;

  return createPortal(
    <div ref={rootRef} className={styles.cursor} aria-hidden="true" data-hidden="false">
      <div ref={ringRef} className={styles.ring} data-state="free" />
      <div ref={dotRef} className={styles.dot} />
    </div>,
    document.body,
  );
}
