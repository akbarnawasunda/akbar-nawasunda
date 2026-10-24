"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

import { registerDepth, type DepthOptions } from "./scroll-engine";
import styles from "./Depth.module.css";

/**
 * Wrap anything in a layer that moves as the page scrolls.
 *
 *   <Depth y={-90} z={70} scale={0.04}>  … </Depth>   // drifts up and forward
 *   <Depth y={40} rotateX={7}>           … </Depth>   // lags behind and turns into the screen
 *
 * The wrapper is a plain div (or the element you name), so the child keeps its own layout and the
 * animation cannot fight a `transform` that a card already owns. All the cost lives in
 * `scroll-engine.ts`, and nothing is registered under `prefers-reduced-motion`.
 *
 * `perspective` is set on the wrapper when a z-translation or rotation is requested — a transform is
 * only three-dimensional if an ancestor gives it a vanishing point. Without it, `translateZ` is a
 * no-op and the effect silently disappears, which is a bug that looks like a design decision.
 */
export function Depth({
  children,
  className,
  y = 0,
  x = 0,
  rotateX = 0,
  rotateY = 0,
  z = 0,
  scale = 0,
  fade = 0,
  perspective = 1200,
  style,
  "data-layer": dataLayer,
}: DepthOptions & {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /**
   * A stable hook for the review harness (`scripts/qa-motion.mjs`) and for tests. CSS Module class
   * names are hashed and change whenever a file does, so anything that asserts on motion has to
   * target a name the source controls. It is also the honest answer to "how do I know the type and
   * the photograph move at different speeds?" — you can select them.
   */
  "data-layer"?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    return registerDepth(node, { y, x, rotateX, rotateY, z, scale, fade, perspective });
  }, [y, x, rotateX, rotateY, z, scale, fade, perspective]);

  return (
    <div
      ref={ref}
      className={className ? `${styles.depth} ${className}` : styles.depth}
      data-layer={dataLayer}
      style={{ perspective: perspective ? `${perspective}px` : undefined, ...style }}
    >
      {children}
    </div>
  );
}
