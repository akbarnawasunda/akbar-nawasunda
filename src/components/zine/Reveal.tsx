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
 * Fade-and-rise on first entry, once, via IntersectionObserver.
 *
 * The element is visible by default in CSS and only *starts* hidden after the observer attaches, so
 * a browser without JS (or with the observer missing) still shows the content — the failure mode of
 * a scroll-reveal library is an empty page, and that is not a risk worth taking for an entrance.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          node.dataset.visible = "true";
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    node.classList.add(styles.armed ?? "reveal-armed");
    observer.observe(node);
    return () => observer.disconnect();
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
