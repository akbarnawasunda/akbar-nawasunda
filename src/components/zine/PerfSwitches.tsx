"use client";

import { useEffect } from "react";

import { activePerfFlags } from "./perf-flags";

/**
 * Publishes the `?perf=` switches to CSS as `html[data-perf="…"]`.
 *
 * JavaScript alone is not enough for the ablation: the header's blur is a CSS declaration, so
 * turning it back on has to be a selector, not a code path. Writing the switches to the root
 * element lets `SiteHeader.module.css` react to the same URL the components read, from one source
 * of truth (`perf-flags.ts`).
 *
 * It writes one attribute, in an effect, and renders nothing. No state, so a page loaded with
 * `?perf=` does not re-render once for a diagnostic that most visitors never trigger. Doing this in
 * a server component instead would have read the query string on the server and produced two
 * different HTML trees for the same page, which is the thing that makes a static route dynamic.
 */
export function PerfSwitches() {
  useEffect(() => {
    const flags = activePerfFlags();
    if (!flags) return;
    document.documentElement.dataset.perf = flags;
  }, []);

  return null;
}
