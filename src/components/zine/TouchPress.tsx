"use client";

import { useEffect } from "react";

import { buzz } from "@/lib/haptics";

/**
 * Round 32, owner's instruction: a tap on a phone must answer like a physical button. One
 * delegated `pointerdown` listener gives every link and button on the site the haptic tick —
 * a single listener instead of an `onClick` per element, which also keeps server components
 * (the footer renders on the server) free of event-handler props they may not carry.
 *
 * Touch only: a mouse click has its own answer (the 100 ms press scale), and a pen writes rather
 * than taps. `navigator.vibrate` is a no-op wherever it does not exist, so the guard is the
 * feature check itself.
 */
export function TouchPress() {
  useEffect(() => {
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("a, button, [role='button']")) buzz(10);
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  return null;
}
