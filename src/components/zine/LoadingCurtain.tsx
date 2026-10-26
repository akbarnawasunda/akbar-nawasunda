"use client";

import { useEffect, useRef } from "react";

import { siteConfig } from "@/config/site";

import styles from "./LoadingCurtain.module.css";

/**
 * The title sequence.
 *
 * A record label does not open a page, it opens a *reel*: leader, a count, the name, then the
 * picture. That is the shape of this curtain, and the count is real — it runs from 000 to 100 over
 * the same 1.3 s the bar takes to fill, driven by one rAF loop, so the number can never disagree
 * with the line under it.
 *
 * Four rules still keep it a flourish rather than a tax (unchanged from round 5, and they are the
 * reason it is allowed to exist at all):
 * - it never waits on the network. The timer starts the animation, not the fetch;
 * - it is shown once per session, so a reader coming back to the catalogue does not sit through it;
 * - `prefers-reduced-motion: reduce` removes it before it ever paints;
 * - the hero is already in the DOM underneath, so its photograph is decoding during the sequence
 *   rather than after it.
 *
 * The exit is two sheets, ink then blue, 80 ms apart. That is where the identity colour enters the
 * site: the first thing a visitor sees of the brand is a full screen of it leaving the frame.
 *
 * State is written to the DOM, not to React: this node is removed when it ends, and a `setState`
 * for an `aria-hidden` decoration would re-render the whole route for nothing.
 */
const SHOWN_KEY = "an-curtain";
/** How long the sheet stays up before it starts to lift. */
const HOLD_MS = 900;
/** How long the lift takes, and the gap between the ink sheet and the blue one. */
const LIFT_MS = 480;
const GAP_MS = 80;
/** The count runs slightly shorter than the hold, so it lands on 100 and is read for a moment. */
const COUNT_MS = 800;

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

    // The count. `textContent` on a node that is already aria-hidden costs one style
    // invalidation on a 3-glyph box, so it is cheaper than any state that triggers React.
    const counter = node.querySelector<HTMLElement>("[data-count]");
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      // Ease-out: the count races to the eighties and then slows, which is how a real leader runs.
      const eased = 1 - (1 - t) ** 2.2;
      if (counter) counter.textContent = String(Math.round(eased * 100)).padStart(3, "0");
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const timer = window.setTimeout(() => {
      node.remove();
      delete document.documentElement.dataset.curtain;
      try {
        window.sessionStorage.setItem(SHOWN_KEY, "1");
      } catch {
        /* ignore */
      }
    }, HOLD_MS + GAP_MS + LIFT_MS + 60);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      delete document.documentElement.dataset.curtain;
    };
  }, []);

  return (
    <div ref={boot} className={styles.boot} data-state="idle" aria-hidden="true">
      {/* The blue sheet sits under the ink one and leaves one frame later. */}
      <div className={styles.sheet} />

      <div className={styles.curtain}>
        <p className={styles.kicker}>
          <span className={styles.live} />
          {siteConfig.origin.replace(", Indonesia", "")} · {siteConfig.since}
        </p>

        <div className={styles.name}>
          <span className={styles.mask}>
            <span className={styles.line}>Akbar</span>
          </span>
          <span className={`${styles.mask} ${styles.maskItalic}`}>
            <span className={`${styles.line} ${styles.lineItalic}`}>Nawasunda</span>
          </span>
        </div>

        <p className={styles.roles}>Produser · Remixer · DJ</p>

        <div className={styles.readout}>
          <span className={styles.readoutLabel}>Memuat</span>
          <span className={styles.count} data-count>
            000
          </span>
        </div>

        <span className={styles.bar}>
          <span className={styles.barFill} />
        </span>
      </div>
    </div>
  );
}
