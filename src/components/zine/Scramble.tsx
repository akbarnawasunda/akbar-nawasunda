"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import styles from "./Scramble.module.css";

/**
 * Scramble — round 31, owner's "wow" A: on hover the letters break into random glyphs for a
 * quarter of a second and reassemble left to right, like a signal re-locking.
 *
 * Rules it keeps: the burst is a `setInterval` that clears itself (no rAF loop of our own), it
 * never fires for touch (`event.pointerType`, per the contract — no hover media queries), it never
 * fires under reduced motion, and the real text stays the accessible name while the scrambling
 * twin is `aria-hidden`, so a screen reader never hears the noise.
 */
const GLYPHS = "AKBRNWSD/\\<>*#0123456789";
const TICK_MS = 28;
const TICKS = 9;

export function Scramble({ text, className }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text);
  const timer = useRef<number | null>(null);

  const stop = () => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => stop, []);

  const onEnter = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (event.pointerType === "touch") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    stop();
    let tick = 0;
    timer.current = window.setInterval(() => {
      tick += 1;
      const locked = (tick / TICKS) * text.length;
      setDisplay(
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < locked) return char;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join(""),
      );
      if (tick >= TICKS) {
        stop();
        setDisplay(text);
      }
    }, TICK_MS);
  };

  const onLeave = () => {
    stop();
    setDisplay(text);
  };

  /*
   * The scrambling twin is `aria-hidden`; the real text rides along in an `.sr-only` span, because
   * an `aria-label` on a role-less span is exactly the kind of name axe rejects (round 31 learned
   * that the hard way: four violations, one per scrambled title).
   */
  return (
    <span
      className={className ? `${styles.host} ${className}` : styles.host}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    >
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
