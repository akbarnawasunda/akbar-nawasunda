"use client";

import { useEffect, useRef } from "react";

import styles from "./LoadingCurtain.module.css";

/**
 * The entry reel — round 30, on the owner's spec: the AN monogram draws itself.
 *
 * One inline SVG, three strokes and the blue full stop. `pathLength={1}` makes every path the same
 * unit length, so one `stroke-dasharray: 1` and one `stroke-dashoffset` keyframe draw all of them;
 * the offsets stagger by a token each, the stop pops as the last stroke lands, and the whole sheet
 * fades out — draw 520 ms, stop at 560 ms, fade from 700 ms to 1000 ms. One second, ceiling included:
 * a loading animation is a greeting, not a toll booth.
 *
 * The three rules that have always kept this component honest are unchanged:
 * - it never waits on the network — the hero is decoding underneath it from the first byte;
 * - it plays once per session (`an-curtain`), so a returning reader is never greeted twice;
 * - `prefers-reduced-motion: reduce` removes it before it paints, in CSS and in JS both.
 *
 * State is still written to the DOM, not to React: the node removes itself when the fade ends and
 * a `setState` for an `aria-hidden` decoration would re-render the whole route for nothing.
 */
const SHOWN_KEY = "an-curtain";
/** draw 520 + the last delay 140 lands at 660; the fade runs 700→1000. Removal sits just after. */
const TOTAL_MS = 1000;

export function LoadingCurtain() {
  const boot = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = boot.current;
    if (!node) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SHOWN_KEY) === "1";
    } catch {
      /* private mode: treat as first visit but never write */
    }

    if (reduce || seen) {
      node.remove();
      return;
    }

    node.dataset.state = "playing";
    document.documentElement.dataset.curtain = "on";

    const timer = window.setTimeout(() => {
      node.remove();
      delete document.documentElement.dataset.curtain;
      try {
        window.sessionStorage.setItem(SHOWN_KEY, "1");
      } catch {
        /* ignore */
      }
    }, TOTAL_MS + 60);

    return () => {
      window.clearTimeout(timer);
      delete document.documentElement.dataset.curtain;
    };
  }, []);

  return (
    <div ref={boot} className={styles.boot} data-state="idle" aria-hidden="true">
      {/*
        The monogram as line work: the A as two legs and a crossbar, the N as one continuous
        stroke, the stop as the brand's only blue. `pathLength={1}` is what lets a single
        dasharray/dashoffset pair draw paths of very different real lengths in the same breath.
      */}
      <svg className={styles.mark} viewBox="0 0 174 112" fill="none" focusable="false">
        <path className={styles.stroke} pathLength={1} d="M14 102 L52 10 L90 102" />
        <path className={styles.stroke} pathLength={1} d="M31 68 H73" />
        <path className={styles.stroke} pathLength={1} d="M104 102 V10 L160 102 V10" />
        <circle className={styles.dot} cx="166" cy="102" r="7" />
      </svg>
    </div>
  );
}
