"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { anMark } from "@/assets/web";

import styles from "./RouteCurtain.module.css";

/**
 * The turn reel.
 *
 * Round 26, owner's ask: entering the site and moving between pages should feel like one film,
 * "mengikuti logo gua". The entry already has the leader curtain; this is the same reel between
 * pages — one ink sheet sweeps up, the AN mark rides it through the middle of the frame, the sheet
 * leaves and the new page is underneath. Nine hundred milliseconds, once per navigation, and it is
 * the mark itself that carries the cut, so a page change is branded by the thing it is a page of.
 *
 * Rules, same discipline as the entry curtain:
 * - it never waits on anything: the mark is a cached WebP and the sheet is a transform;
 * - `prefers-reduced-motion: reduce` removes it entirely — navigation is instant;
 * - it is `aria-hidden` and `pointer-events: none`: a decoration must never be a wall between the
 *   reader and the page underneath, and tests that click fast must click through it;
 * - it plays on client-side navigation only; a cold load is the entry curtain's job.
 */
export function RouteCurtain() {
  const pathname = usePathname();
  const [playing, setPlaying] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    /* Deferred on purpose: the sheet mounts on the next tick, so the browser paints its first
       keyframe instead of skipping a curl that started mid-commit. */
    let stop = 0;
    const start = window.setTimeout(() => {
      setPlaying(true);
      stop = window.setTimeout(() => setPlaying(false), 950);
    }, 0);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
    };
  }, [pathname]);

  if (!playing) return null;

  return (
    <div className={styles.curtain} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- the mark is the cut; it must paint inside the sheet, not as a next/image slot */}
      <img className={styles.mark} src={anMark.src} alt="" width={anMark.width} height={anMark.height} />
    </div>
  );
}
