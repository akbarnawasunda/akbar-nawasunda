"use client";

import { useEffect, useRef } from "react";

/**
 * Run a one-shot animation the first time an element is actually seen.
 *
 * This exists because the paper timeline used to draw itself with `animation-timeline: view()`,
 * which is Chromium 115+ only — the one piece of motion on the About sheet was invisible on Safari
 * and Firefox, and "there is no animation" was the owner's exact complaint about that section.
 *
 * Rules it keeps:
 * - **resting state is the finished state.** If JS never runs, or the reader asked for reduced
 *   motion, the child is simply shown as it is meant to read. Nothing is hidden waiting for a
 *   trigger that may never fire.
 * - one observer per wrapped node, disconnected on the first intersection or on unmount;
 * - `data-drawn` is the only thing written — the animation itself stays in CSS, where the timing
 *   curves live.
 */
export function DrawOnView({
  className,
  children,
  as: Tag = "div",
  stagger = false,
}: {
  className?: string;
  children: React.ReactNode;
  as?: "div" | "ol" | "ul";
  /** Tandai wadah ini sebagai grup tangga (FASE 4b); lihat `EntryStagger`. */
  stagger?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // No IntersectionObserver (very old engine): leave the finished state visible.
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        node.dataset.drawn = "true";
        observer.disconnect();
      },
      // Wait until a fifth of the element has entered, so the draw is not finished before it is read.
      { rootMargin: "0px 0px -15% 0px", threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag className={className} ref={ref as React.Ref<never>} data-stagger={stagger ? "on" : undefined}>
      {children}
    </Tag>
  );
}
