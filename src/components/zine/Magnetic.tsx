"use client";

import { useRef, type ReactNode } from "react";

import styles from "./Magnetic.module.css";

/**
 * Pulls its child a few pixels toward the pointer while the pointer is inside it.
 *
 * Deliberately small (16px at most): the effect is meant to be felt, not seen, and anything larger
 * turns a button into a target that moves away from the cursor. Skipped for reduced motion and on
 * touch, where there is no pointer to follow.
 */
export function Magnetic({ children, strength = 8 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);

  return (
    <span
      ref={ref}
      className={styles.wrap}
      onPointerMove={(event) => {
        const node = ref.current;
        if (!node || event.pointerType !== "mouse") return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const rect = node.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * strength * 2;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * strength;
        node.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = "";
      }}
    >
      {children}
    </span>
  );
}
