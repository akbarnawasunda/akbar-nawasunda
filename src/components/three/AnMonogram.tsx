"use client";

import { useEffect, useRef } from "react";

import styles from "./AnMonogram.module.css";
import { Depth } from "../zine/Depth";

/**
 * The AN monogram: liquid metal, baked.
 *
 * Round 20, owner's instruction, verbatim: "3D pake liquid aja cuy, jangan 3D berat jir". Read
 * plainly — keep the liquid-metal object, lose the engine that computed it every frame. So this
 * file no longer contains a renderer. What it contains is the *output* of the renderer, captured
 * once by `scripts/bake-monogram.mjs` from the round-19 scene (black chrome, neon `#0087FF` edges,
 * bloom at threshold 0.72, the perspective-grid stage) and shipped as two WebP stills:
 *
 *   - `liquid-metal-wide.webp`   — the ≥1024 px composition, mark offset right;
 *   - `liquid-metal-narrow.webp` — the <1024 px composition, mark centred.
 *
 * Why pixels and not an approximation: a chrome surface is nothing but what it reflects, and what
 * it reflected was an authored PMREM room plus a vertex-shader noise field. CSS cannot fake that
 * without the banned vocabulary (gradients stacked into a lie, blur as a substitute for light), and
 * an SVG trace of the silhouette would be a sticker of the object, not the object. The bake is the
 * object, photographed once.
 *
 * What this costs now, against what it cost before:
 * - **before**: `three` + the post-processing chain as a lazy chunk (~150 KB gz of JavaScript that
 *   still had to parse, compile shaders and build a PMREM room), a WebGL context, a rAF loop at
 *   30–60 fps for as long as the band was on screen, and nothing at all below 768 px — a phone saw
 *   an empty band, which is a large part of why the site read as "jelek" on one;
 * - **after**: 47 KB + 35 KB of WebP, lazy like any other image, no JavaScript beyond the reveal
 *   flag, no context, no loop, and the object finally exists on every viewport.
 *
 * The band still moves, because a dead band is its own kind of ugly: the still is wrapped in the
 * site's one scroll engine (`<Depth>`), so it drifts and settles with the page through the same
 * single rAF loop everything else uses — no second loop, and under `prefers-reduced-motion` the
 * engine registers nothing and the mark simply stands there, which is the correct fallback.
 *
 * The reveal contract is unchanged: the host carries `data-ready` once the image has decoded, the
 * CSS fades it in, and `scripts/qa-motion.mjs` asserts there is not a single canvas element left
 * anywhere on the site. WebGL is not a dependency of this page any more.
 */

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

  useEffect(() => {
    const host = hostRef.current;
    const img = host ? host.querySelector("img") : null;
    if (!host || !img) return;
    const reveal = () => {
      host.dataset.ready = "true";
    };
    /* A cached image is already complete before the effect runs on a second visit; listening for a
       `load` that already fired would leave the band invisible forever. */
    if (img.complete) reveal();
    else img.addEventListener("load", reveal, { once: true });
    return () => img.removeEventListener("load", reveal);
  }, []);

  return (
    <div ref={hostRef} className={styles.canvas} aria-hidden="true">
      <Depth className={styles.drift} y={-26} scale={0.07} data-layer="monogram-still">
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
      </Depth>
    </div>
  );
}
