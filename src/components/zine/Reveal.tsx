"use client";

import { useEffect, useRef, type ReactNode } from "react";

import styles from "./Reveal.module.css";

interface RevealProps {
  children: ReactNode;
  /** Stagger step in ms, applied as a CSS custom property. */
  delay?: number;
  className?: string;
}

/**
 * Rise-and-tilt on first entry, once, via IntersectionObserver.
 *
 * The motion is three-dimensional on purpose: the block starts 34 px low, 40 px behind the page and
 * tilted 7° away, then settles. That is the cheapest honest way to make a scroll feel like it has
 * depth on every engine — the CSS scroll-timeline pass that preceded this only ran in Chromium.
 *
 * The element is visible by default in CSS and only *starts* hidden after the observer attaches, so
 * a browser without JS (or with the observer missing) still shows the content — the failure mode of
 * a scroll-reveal library is an empty page, and that is not a risk worth taking for an entrance.
 *
 * Round 35 — the stuck-at-zero bug, and its three fixes:
 *
 *   1. **A forgiving gate.** The old observer used `rootMargin: "0px 0px -12% 0px"`, which *shrinks*
 *      the viewport: a card sitting in the bottom eighth of the screen was not "intersecting" and
 *      stayed invisible until the reader scrolled it further up. Threshold 0.05 + a 50 px margin on
 *      every edge means a block reveals as soon as any sliver of it is near the screen.
 *   2. **A failsafe timer.** Some environments never deliver an entry at all: an element inside a
 *      transformed/`overflow: hidden` ancestor, a browser that restores scroll position before the
 *      observer is laid out, a tab restored from the back/forward cache. A 400 ms timer shows the
 *      block regardless — an entrance animation is a courtesy, and courtesy never gets to keep
 *      content hostage.
 *   3. **A visible fallback if IO is missing.** No `IntersectionObserver` (old browsers, some
 *      embedded webviews) now just skips the hidden state entirely.
 */
const FAILSAFE_MS = 400;

export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    let done = false;
    let timer = 0;

    const reveal = () => {
      if (done) return;
      done = true;
      node.dataset.visible = "true";
      observer.disconnect();
      window.clearTimeout(timer);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          /* `isIntersecting` is the cheap truth; `intersectionRatio > 0` catches the engines that
             report a true rect with a zero ratio during a fast scroll. */
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            reveal();
            return;
          }
        }
      },
      /* A 50 px margin on every edge: generous, because an entrance that fires slightly early is
         invisible, while one that never fires is a blank card. */
      { threshold: 0.05, rootMargin: "50px" },
    );

    node.classList.add(styles.armed ?? "reveal-armed");
    observer.observe(node);
    /* The failsafe runs from the moment the hidden state is applied, so the worst case is 400 ms of
       reduced opacity — never a page section that stays empty. */
    timer = window.setTimeout(reveal, FAILSAFE_MS);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      /* Leaving mid-animation must not leave the node hidden for the next mount. */
      node.dataset.visible = "true";
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className ? `${styles.reveal ?? ""} ${className}` : styles.reveal}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
