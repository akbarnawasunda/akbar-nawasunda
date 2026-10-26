"use client";

import { useEffect, useRef } from "react";

import styles from "./AnMonogram.module.css";
import { Depth } from "../zine/Depth";

/**
 * The AN monogram: liquid, and quiet about it.
 *
 * Round 25 made it water; round 26 made the water *visible* and *cheap*, on the owner's two
 * complaints — "the liquid does nothing" and "the page lags". Both had the same root: the first
 * version hid the split behind an opaque base at 8px and paid for a full-viewport SVG displacement
 * filter on every pointer move. A displacement filter re-rasterises turbulence for a million
 * pixels per frame; that is the lag, and an 8px fringe behind an opaque sheet is the nothing.
 *
 * So the water is now three compositor-only transforms and nothing else:
 *
 * 1. **The part.** Two extra copies of the same baked still sit on top of the base (not under it).
 *    While the pointer is inside the band they drift apart along the pointer vector — token-scaled,
 *    a centimetre at most — at almost half strength, so the mark visibly doubles at its edges and
 *    heals back into one surface when the hand leaves. A surface that splits under a finger and
 *    closes behind it is the whole grammar of liquid.
 * 2. **The lean.** The base answers with a smaller counter-translate, which is what makes the part
 *    read as reaction rather than glitch.
 * 3. **The swell.** The whole stack breathes up half a percent under the pointer, the way a
 *    reflection thickens where it is touched.
 *
 * No WebGL (round 20 retired the renderer on "jangan 3D berat jir"), no canvas (banned site-wide),
 * no second rAF loop (the contract allows exactly one, and the scroll engine owns it): everything
 * the pointer writes is a CSS custom property inside the event handler, smoothed by transitions.
 * The layout-thrash lesson still stands — the band's rect is read once per scroll burst, never per
 * move. Reduced motion gets the still, unsplit.
 *
 * The bake is unchanged: two WebP stills from the round-19 renderer (`scripts/bake-monogram.mjs`),
 * lazy like any image, present on every viewport including phones.
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

    /* Round 27: off-screen the water sleeps. An IntersectionObserver flips one boolean; while the
       band is out of view the pointer handler returns before it even reads its cached rect, so a
       page scrolled away from the monogram pays nothing for it. */
    let inView = false;
    const observer = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? false;
      },
      { rootMargin: "10% 0px" },
    );
    observer.observe(host);

    /* Cached geometry: the rect is read once per scroll burst and on entry, never per pointermove.
       A 125 Hz mouse must not become 125 forced reflows — that bug is why this file reads the way
       it does. */
    let rect = host.getBoundingClientRect();
    let rectDirty = false;
    const onScroll = () => {
      rectDirty = true;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const write = (lx: number, ly: number) => {
      host.style.setProperty("--lx", lx.toFixed(3));
      host.style.setProperty("--ly", ly.toFixed(3));
      host.style.setProperty("--lstr", "1");
    };
    const onMove = (event: PointerEvent) => {
      if (!inView) return;
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
        if (host.style.getPropertyValue("--lstr") !== "0") {
          host.style.setProperty("--lstr", "0");
        }
        return;
      }
      write(
        ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
        ((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1,
      );
    };
    const onOff = () => {
      host.style.setProperty("--lstr", "0");
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
      observer.disconnect();
    };
  }, []);

  const still = (extra: string | undefined, key: string) => (
    <picture key={key}>
      <source media="(max-width: 1023px)" srcSet={NARROW.src} type="image/webp" />
      <img
        className={extra}
        src={WIDE.src}
        alt=""
        width={WIDE.width}
        height={WIDE.height}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
      />
    </picture>
  );

  return (
    <div ref={hostRef} className={styles.canvas} aria-hidden="true">
      <Depth className={styles.drift} y={-26} scale={0.07} data-layer="monogram-still">
        <div className={styles.liquid}>
          {still(styles.still, "base")}
          {still(`${styles.split} ${styles.splitA}`, "split-a")}
          {still(`${styles.split} ${styles.splitB}`, "split-b")}
        </div>
      </Depth>
    </div>
  );
}
