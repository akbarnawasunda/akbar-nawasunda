"use client";

import { useEffect } from "react";

/**
 * Inertial scrolling (Lenis), mounted once in the site layout.
 *
 * Lenis does not hijack the scroll: it reads the wheel, then writes `window.scrollTo` itself on a
 * rAF, so native scrolling, keyboard paging, `scrollIntoView`, scroll-snap, and the CSS scroll
 * timelines on the header all keep working. That is the whole reason it is allowed here while a
 * `body { overflow: hidden }` scroll-jacker is not (D-096).
 *
 * `lerp: 0.08` is the owner's number: short enough that the page answers the wheel immediately,
 * long enough that a long jump still glides. Off for reduced motion and off for touch: a phone
 * already has the platform's own inertia, and overriding it makes the page feel slower.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;

    let lenis: { raf: (time: number) => void; destroy: () => void } | undefined;
    let frame = 0;
    let cancelled = false;

    const start = async () => {
      const { default: Lenis } = await import("lenis");
      if (cancelled) return;
      const instance = new Lenis({
        // A long, slow tail: the "expensive" part of a smooth scroll is that it keeps coasting.
        lerp: 0.08,
        duration: 1.15,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 0.95,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
      lenis = instance;
      const raf = (time: number) => {
        instance.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    };

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, []);

  return null;
}
