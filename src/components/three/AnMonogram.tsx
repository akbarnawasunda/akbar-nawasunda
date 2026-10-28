"use client";

import { Suspense, useEffect, useRef, useState } from "react";

import Image from "next/image";
import dynamic from "next/dynamic";

import styles from "./AnMonogram.module.css";
import { Depth } from "../zine/Depth";

/**
 * The AN monogram band — round 34: the WebGL liquid is replaced by a canvas-2D foil.
 *
 * This file stays the orchestrator:
 *
 * - the baked WebP stills remain the base layer and the fallback: reduced motion, no-JS, or a
 *   browser without canvas 2D all read the still;
 * - the foil (`AnMonogramFoil`, the lazy split chunk) is imported dynamically the first time the
 *   band approaches the viewport, so nothing heavy is on the critical path and `check:web`'s
 *   budget only sees what `/` references;
 * - the foil draws the same six AN strokes with canvas 2D — no WebGL, no shader, no three — and
 *   parks its rAF loop when the band leaves the viewport.
 *
 * No rAF loop of our own lives here: the foil owns its own loop (parked by its own
 * IntersectionObserver), the scroll engine owns the page's single loop for the parallax `Depth`
 * layer, and pointer geometry is read inside the foil — never per frame in this file.
 */

/* Round 34: `next/dynamic` with `ssr: false`, so the foil chunk is never considered server-side
   and only ever arrives in the browser, when the band approaches. */
const Foil = dynamic(() => import("./AnMonogramFoil"), {
  ssr: false,
  loading: () => null,
});

const WIDE = {
  src: "/assets/monogram/liquid-metal-wide.webp",
  width: 2160,
  height: 1242,
};

export function AnMonogram() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [foil, setFoil] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const img = host.querySelector("img");
    const reveal = () => {
      host.dataset.ready = "true";
    };
    /* Load, error and a short safety timer all reveal the band — a blocked or failed still must
       never leave the whole section at opacity 0. */
    if (img?.complete) reveal();
    else {
      img?.addEventListener("load", reveal, { once: true });
      img?.addEventListener("error", reveal, { once: true });
    }
    const revealTimer = window.setTimeout(reveal, 1600);

    /* Only mount the foil when motion is allowed. The foil itself parks its rAF loop off screen;
       reduced motion never mounts it at all, so the still is the only thing on the band. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => window.clearTimeout(revealTimer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setFoil(true);
          observer.disconnect();
        }
      },
      /* No fat margin: the hero above is exactly a viewport tall, so any rootMargin would fire at
         scroll 0 and pull the foil chunk into the first load. threshold 0.01 means the chunk is
         fetched the moment the band's first pixel row actually enters the screen. */
      { rootMargin: "0px", threshold: 0.01 },
    );
    observer.observe(host);
    return () => {
      observer.disconnect();
      window.clearTimeout(revealTimer);
    };
  }, []);

  return (
    <div ref={hostRef} className={styles.canvas} aria-hidden="true">
      <Depth className={styles.drift} y={-26} scale={0.07} data-layer="monogram-still">
        <div className={styles.liquid}>
          <Image
            className={styles.still}
            src={WIDE.src}
            alt=""
            width={WIDE.width}
            height={WIDE.height}
            sizes="100vw"
            loading="lazy"
          />
        </div>
      </Depth>
      {foil ? (
        <Suspense fallback={null}>
          <Foil />
        </Suspense>
      ) : null}
    </div>
  );
}
