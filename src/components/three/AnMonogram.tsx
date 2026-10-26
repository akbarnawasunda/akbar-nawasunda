"use client";

import { useEffect, useRef } from "react";

import styles from "./AnMonogram.module.css";
import { Depth } from "../zine/Depth";

/**
 * The AN monogram: liquid, and quiet about it.
 *
 * Round 25, owner's instruction: drop the "Tanda AN" copy (a mark that has to introduce itself is
 * a mark that does not trust itself), and make the object behave like water — touch it and it
 * parts, a little, then closes back up. No WebGL (round 20 retired the renderer on "jangan 3D
 * berat jir"), no canvas (banned site-wide since), no second rAF loop (the contract allows exactly
 * one, and the scroll engine owns it). Three cheap tricks do the water instead:
 *
 * 1. **The part.** Two extra copies of the same baked still sit exactly on top of it. While the
 *    pointer is inside the band they drift apart along the pointer vector — a few pixels, never
 *    more — and fade back to nothing when it leaves. A surface that splits under a finger and
 *    heals behind it is the whole grammar of liquid, and it costs two composited transforms.
 * 2. **The wobble.** An inline SVG filter (feTurbulence → feDisplacementMap) bends the whole stack
 *    like a reflection in disturbed water. The displacement scale is written from the pointer's
 *    own speed (event timestamps, no clock of our own) and only exists while the band is touched:
 *    `data-liquid` gates the filter, so an untouched band pays zero filter cost.
 * 3. **The lean.** The base still answers the pointer with a counter-translate of a few pixels,
 *    which is what makes the part read as *reaction* rather than as a glitch.
 *
 * Everything the pointer writes is a CSS custom property or one SVG attribute, written inside the
 * event handler and smoothed by transitions — the layout thrash lesson still stands, so the band's
 * rect is read once per scroll burst, never per move.
 *
 * The bake is unchanged: two WebP stills from the round-19 renderer (`scripts/bake-monogram.mjs`),
 * lazy like any image, present on every viewport including phones, which rounds 14–19 starved.
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
    if (!host) return;
    const img = host.querySelector("img");
    if (!img) return;
    const reveal = () => {
      host.dataset.ready = "true";
    };
    /* A cached image is already complete before the effect runs on a second visit; listening for a
       `load` that already fired would leave the band invisible forever. */
    if (img.complete) reveal();
    else img.addEventListener("load", reveal, { once: true });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const displace = host.querySelector("feDisplacementMap");
    if (!displace) return;

    /* Cached geometry: the rect is read once per scroll burst and on entry, never per pointermove.
       A 125 Hz mouse must not become 125 forced reflows — that bug is why this file reads the way
       it does. */
    let rect = host.getBoundingClientRect();
    let rectDirty = false;
    const onScroll = () => {
      rectDirty = true;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    let lastStamp = 0;
    const onMove = (event: PointerEvent) => {
      if (rectDirty) {
        rect = host.getBoundingClientRect();
        rectDirty = false;
      }
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) {
        if (host.dataset.liquid) {
          delete host.dataset.liquid;
          host.style.setProperty("--lstr", "0");
          displace.setAttribute("scale", "0");
        }
        return;
      }
      const nx = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const ny = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
      /* Speed from the event's own timestamps: the wobble follows the hand, not a clock. */
      const dt = lastStamp ? Math.max(8, event.timeStamp - lastStamp) : 16;
      lastStamp = event.timeStamp;
      const speed = Math.min(1, Math.hypot(event.movementX ?? 0, event.movementY ?? 0) / dt / 2.2);
      host.dataset.liquid = "on";
      host.style.setProperty("--lx", nx.toFixed(3));
      host.style.setProperty("--ly", ny.toFixed(3));
      host.style.setProperty("--lstr", "1");
      displace.setAttribute("scale", (3 + speed * 9).toFixed(1));
    };
    const onOff = () => {
      delete host.dataset.liquid;
      host.style.setProperty("--lstr", "0");
      displace.setAttribute("scale", "0");
      lastStamp = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("blur", onOff);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("blur", onOff);
      img.removeEventListener("load", reveal);
    };
  }, []);

  return (
    <div ref={hostRef} className={styles.canvas} aria-hidden="true">
      {/* The water: one turbulence field, displacement gated by touch. */}
      <svg className={styles.filterSvg} aria-hidden="true" focusable="false">
        <filter id="an-liquid">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.014" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <Depth className={styles.drift} y={-26} scale={0.07} data-layer="monogram-still">
        <div className={styles.liquid}>
          <picture>
            <source media="(max-width: 1023px)" srcSet={NARROW.src} type="image/webp" />
            <img
              className={`${styles.split} ${styles.splitA}`}
              src={WIDE.src}
              alt=""
              width={WIDE.width}
              height={WIDE.height}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          </picture>
          <picture>
            <source media="(max-width: 1023px)" srcSet={NARROW.src} type="image/webp" />
            <img
              className={`${styles.split} ${styles.splitB}`}
              src={WIDE.src}
              alt=""
              width={WIDE.width}
              height={WIDE.height}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          </picture>
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
        </div>
      </Depth>
    </div>
  );
}
