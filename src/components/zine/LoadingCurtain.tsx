"use client";

import { useEffect, useRef } from "react";

import { anOutlinePath } from "@/assets/an-shape";

import styles from "./LoadingCurtain.module.css";

/**
 * Opening curtain: the AN mark draws itself once, the wordmark types in, then the sheet lifts.
 *
 * Three rules keep it a flourish rather than a tax:
 * - it never waits for the network — it is dismissed on a timer, so a slow connection still gets the
 *   page underneath as soon as it arrives;
 * - it is shown once per session (`sessionStorage`), so a reader who comes back is not made to watch
 *   the same two seconds again;
 * - it is skipped entirely for `prefers-reduced-motion: reduce`.
 *
 * The hero is already rendered underneath while the curtain is up, so the LCP image is decoding
 * during the animation instead of after it.
 *
 * State lives on the element, not in React: this is a one-shot DOM decoration that is removed from
 * the page when it ends, and a `setState` inside the effect would only cause a cascading render of
 * the whole route for a node that is `aria-hidden`.
 */
const SHOWN_KEY = "an-curtain";
const HOLD_MS = 1150;

export function LoadingCurtain() {
  const curtain = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = curtain.current;
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
    }, HOLD_MS);

    return () => {
      window.clearTimeout(timer);
      delete document.documentElement.dataset.curtain;
    };
  }, []);

  return (
    <div ref={curtain} className={styles.curtain} data-state="idle" aria-hidden="true">
      <svg className={styles.mark} viewBox="-0.55 -0.4 1.1 0.8" role="presentation">
        <path className={styles.path} d={anOutlinePath} fill="none" strokeWidth="0.012" />
      </svg>
      <p className={styles.word}>
        {"AKBAR NAWASUNDA".split("").map((char, index) => (
          <span key={`${char}-${index}`} style={{ animationDelay: `${220 + index * 26}ms` }}>
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </p>
      <span className={styles.bar}>
        <span className={styles.barFill} />
      </span>
    </div>
  );
}
