"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Pointer-driven 3D tilt for a flat object (the hero portrait).
 *
 * The transform is written to CSS variables on a wrapper so the child keeps its own layout and the
 * effect costs nothing until a fine pointer is present. Three inputs, in priority order:
 * - pointer position within the element: ±10deg on Y, ±5deg on X, eased with a lerp in a rAF;
 * - scroll: the card turns away from the reader as the hero leaves, which is what makes it feel
 *   attached to the page rather than pasted on it;
 * - nothing at all for `prefers-reduced-motion` or a coarse pointer.
 */
export function Tilt3D({
  children,
  className,
  strength = 1,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;

    const target = { x: 0, y: 0, scroll: 0 };
    const current = { x: 0, y: 0, scroll: 0 };
    let frame = 0;

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      target.y = nx * 20 * strength;
      target.x = -ny * 10 * strength;
    };
    const onPointerLeave = () => {
      target.x = 0;
      target.y = 0;
    };
    const onScroll = () => {
      const rect = host.getBoundingClientRect();
      target.scroll = Math.min(1, Math.max(0, -rect.top / Math.max(240, rect.height)));
    };

    const tick = () => {
      current.x += (target.x - current.x) * 0.09;
      current.y += (target.y - current.y) * 0.09;
      current.scroll += (target.scroll - current.scroll) * 0.1;
      host.style.setProperty("--tilt-x", `${current.x - current.scroll * 6}deg`);
      host.style.setProperty("--tilt-y", `${current.y + current.scroll * 10}deg`);
      host.style.setProperty("--tilt-z", `${current.scroll * 30}px`);
      host.style.setProperty("--tilt-scale", `${1 + current.scroll * 0.04}`);
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    host.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    frame = requestAnimationFrame(tick);
    onScroll();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", onScroll);
      host.style.removeProperty("--tilt-x");
      host.style.removeProperty("--tilt-y");
      host.style.removeProperty("--tilt-z");
      host.style.removeProperty("--tilt-scale");
    };
  }, [strength]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
