"use client";

import { useEffect, useRef } from "react";

import styles from "./ScrollProgress.module.css";

/**
 * 2px reading-progress bar pinned above the header.
 *
 * One scroll listener, coalesced into a single rAF, writing one transform. No layout reads inside the
 * handler beyond the cached document height, and the bar is `aria-hidden` because it duplicates
 * information the scrollbar already exposes.
 */
export function ScrollProgress() {
  const bar = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let frame = 0;
    let max = 0;

    const measure = () => {
      max = document.documentElement.scrollHeight - window.innerHeight;
    };

    const paint = () => {
      frame = 0;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${ratio})`;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    measure();
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      measure();
      onScroll();
    });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className={styles.track} aria-hidden="true">
      <span ref={bar} className={styles.bar} />
    </div>
  );
}
