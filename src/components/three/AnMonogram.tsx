"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";

import styles from "./AnMonogram.module.css";
import { Depth } from "../zine/Depth";

/**
 * The AN monogram band — round 29: the water is a shader now, on the owner's absolute spec.
 *
 * This file stays the orchestrator and the contract's sanctioned surface for the mark:
 *
 * - the baked WebP stills (round 20) remain the base layer and the fallback: no WebGL, reduced
 *   motion, or a screen under 768px never mounts the GPU path at all and simply reads the still;
 * - the liquid shader (`AnMonogramLiquid`, the lazy split chunk that owns the three/@react-three/
 *   fiber import) is imported dynamically the first time the band approaches the viewport, so
 *   nothing heavy is on the critical path and `check:web`'s budget only sees what `/` references;
 * - while the band is off screen the Canvas runs `frameloop="never"` — zero GPU work;
 * - once the shader is live the still fades out under it (`data-liquid`), but stays in the DOM,
 *   lazy and decoded, as the surface qa and the fallback both rely on.
 *
 * No rAF loop of our own lives here: the shader's clock is R3F's `useFrame`, the scroll engine owns
 * the page's single loop, and pointer geometry is read once per mount/resize/scroll-burst inside
 * the liquid chunk — never per frame. The React Compiler rules shape the plumbing: the host div
 * lives in a ref that only effects touch, and the liquid chunk measures itself — render never
 * reads a ref and nothing frozen is ever mutated.
 */

const Liquid = lazy(() => import("./AnMonogramLiquid"));

const WIDE = {
  src: "/assets/monogram/liquid-metal-wide.webp",
  width: 2160,
  height: 1242,
};
const NARROW = {
  src: "/assets/monogram/liquid-metal-narrow.webp",
  width: 1350,
  height: 1104,
};

export function AnMonogram() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [liquid, setLiquid] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const img = host.querySelector("img");
    if (img) {
      const reveal = () => {
        host.dataset.ready = "true";
      };
      /* A cached image is already complete before the effect runs on a second visit; listening for
         a `load` that already fired would leave the band invisible forever. */
      if (img.complete) reveal();
      else img.addEventListener("load", reveal, { once: true });
    }

    /* The GPU path is a desktop luxury: reduced motion keeps the still, phones keep the narrow
       bake, and neither pays for a context it would not use. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLiquid(true);
          observer.disconnect();
        }
      },
      /* No fat margin: the hero above is exactly a viewport tall, so any rootMargin would fire at
         scroll 0 and pull the three.js chunk into the first load. threshold 0.01 means the chunk
         is fetched the moment the band's first pixel row actually enters the screen. */
      { rootMargin: "0px", threshold: 0.01 },
    );
    observer.observe(host);
    return () => observer.disconnect();
    /* Mount-only: the host ref is set before effects run, refs and setters are stable, and the
       observer disconnects itself once it has done its single job. */
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (liquid) host.dataset.liquid = "on";
    else delete host.dataset.liquid;
  }, [liquid]);

  return (
    <div ref={hostRef} className={styles.canvas} aria-hidden="true">
      <Depth className={styles.drift} y={-26} scale={0.07} data-layer="monogram-still">
        <div className={styles.liquid}>
          <picture>
            <source media="(max-width: 1023px)" srcSet={NARROW.src} type="image/webp" />
            <img
              className={styles.still}
              src={WIDE.src}
              alt=""
              width={WIDE.width}
              height={WIDE.height}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          </picture>
          {liquid ? (
            <Suspense fallback={null}>
              <Liquid />
            </Suspense>
          ) : null}
        </div>
      </Depth>
    </div>
  );
}
