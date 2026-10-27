"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { anMark } from "@/assets/web";

import styles from "./RouteCurtain.module.css";

/**
 * The turn reel — and it waits for nothing that is not real.
 *
 * Round 26 played a fixed 950 ms reel after every navigation, which is exactly the fake loading
 * the round-27 brief forbids: a duration whether the page is ready or not. Round 27 inverts the
 * mechanism so the animation is a *measure* of the navigation instead of a tax on it:
 *
 * - a capture-phase click on an internal link drops the ink sheet (240 ms) while the router
 *   fetches — the cover hides real work being done, not an invented pause;
 * - the moment `usePathname` changes (the new route has committed) the sheet lifts and the AN mark
 *   rides the middle of it out of frame (320 ms);
 * - if the navigation never commits (aborted click, failed fetch) a safety timer lifts the sheet
 *   anyway, so a broken route can never trap the reader behind ink;
 * - clicks that are not plain left-button internal navigation (modifiers, external hrefs, targets,
 *   the back/forward buttons) never raise the sheet at all.
 *
 * `aria-hidden`, `pointer-events: none`, absent under reduced motion, and never painted on a cold
 * load — that is the entry curtain's reel, kept deliberately shorter in round 27 (900 ms hold) so
 * the first tap on the catalogue is never more than a second away.
 */
type Phase = "idle" | "cover" | "lift";

const SAFETY_MS = 2500;

export function RouteCurtain() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (phaseRef.current !== "idle") return;
      setPhase("cover");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  /* The commit is the cue: new route painted, sheet lifts. */
  useEffect(() => {
    if (phaseRef.current === "cover") setPhase("lift");
  }, [pathname]);

  useEffect(() => {
    if (phase !== "cover") return;
    const safety = window.setTimeout(() => setPhase((value) => (value === "cover" ? "lift" : value)), SAFETY_MS);
    return () => window.clearTimeout(safety);
  }, [phase]);

  if (phase === "idle") return null;

  return (
    <div
      className={styles.curtain}
      data-phase={phase}
      aria-hidden="true"
      onAnimationEnd={(event) => {
        /* The sheet's own lift animation ending is the only clock this component trusts. */
        if (phase === "lift" && event.animationName.includes("route-lift")) setPhase("idle");
      }}
    >
      <Image
        className={styles.mark}
        src={anMark.src}
        alt=""
        width={anMark.width}
        height={anMark.height}
        loading="eager"
      />
    </div>
  );
}
