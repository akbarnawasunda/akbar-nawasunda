"use client";

import { useMediaQuery } from "./useMediaQuery";

/** True when the user has asked the system to reduce motion. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
