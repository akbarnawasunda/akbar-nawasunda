"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import Image from "next/image";
import dynamic from "next/dynamic";

import styles from "./AnMonogram.module.css";
import { Depth } from "../zine/Depth";

/**
 * The AN monogram band — the orchestrator.
 *
 * This file owns three things and nothing else: the baked still, the lazy boundary, and the mount
 * gate. The drawing lives in `AnMonogramFoil` (Canvas 2D); see that file for the material itself.
 *
 * ---------------------------------------------------------------------------------------------
 * THE MOUNT GATE (why the canvas is not in the first fold)
 *
 * The contract in `scripts/qa-motion.mjs` is absolute: **zero canvas elements at scroll
 * position 0, on any viewport.** It used to fail on phones, and the cause was not a race — it was
 * layout. `page.module.css` sets `.hero { height: min(100svh, 58rem) }`, so at 1440×900 the hero is
 * exactly one viewport tall and the band starts at y=900, below the fold. But at ≤899px the hero
 * switches to `height: auto` and collapses to its content: measured at 390×844 the hero is 546 px,
 * the band starts at y=627 and is **34.7 % visible at scroll 0**. The old observer (threshold 0.01)
 * therefore fired on load, correctly, because the band really was on screen.
 *
 * Raising the threshold would not fix that — a third of the band is a third of the band. So the
 * gate now requires two things: the band is intersecting **and** the reader has actually scrolled
 * (`scrollY > 1`). That is the honest statement of the contract ("nothing heavy before the reader
 * moves"), it holds at every breakpoint by construction, and it is measurable in the DOM:
 * `AnMonogram.testid`-free `data-foil-state` records `idle` / `active`.
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT STAYS
 *
 * The baked WebP still remains the floor, exactly as `qa:motion` asserts: a lazy image with real
 * decoded pixels under the foil, so the band still reads as a printed plate if the 2D context is
 * unavailable, and the section is never a 74svh void. It fades out under the foil once the foil has
 * painted (`data-foil="on"`), the same reveal contract the shader had.
 */

/* The chunk that owns the canvas. Still lazy and still `ssr: false`: the canvas must never be part
   of the server render, because a canvas element in the HTML is a canvas element at scroll 0. */
const Foil = dynamic(() => import("./AnMonogramFoil"), {
  ssr: false,
  loading: () => null,
});

const WIDE = {
  src: "/assets/monogram/liquid-metal-wide.webp",
  width: 2160,
  height: 1242,
};

/** Nothing mounts before the reader has moved at all. 1 px absorbs sub-pixel scroll jitter. */
const SCROLL_GATE = 1;

export function AnMonogram() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  /*
   * The still fades out under `data-foil="on"`, so that attribute waits for the foil to have actually
   * painted. Since the plates are rasterised in a worker (see AnMonogramFoil), there is now a frame
   * or two between "mounted" and "material on screen"; flipping the attribute at mount would fade the
   * still into an empty band for those frames.
   */
  const [painted, setPainted] = useState(false);
  const onPainted = useCallback((next: boolean) => setPainted(next), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    /* The still reveals itself the moment it decodes — on a cached second visit it is already
       complete before this effect runs, so listening for a `load` that already fired would leave
       the band invisible forever. */
    const img = host.querySelector("img");
    if (img) {
      const reveal = () => {
        host.dataset.ready = "true";
      };
      if (img.complete) reveal();
      else img.addEventListener("load", reveal, { once: true });
    }

    /*
     * Reduced motion is NOT "do not draw the mark". The owner's spec is explicit — the effect still
     * renders, as ONE static frame — so the gate below stays identical and the decision moves into
     * the foil chunk, which draws a fixed phase and never starts a loop when the reader asked for
     * stillness. Skipping the mount here would have quietly deleted the band's subject.
     */

    let done = false;

    const nearEnough = () => {
      const rect = host.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    };

    const tryMount = () => {
      if (done) return;
      /* Both conditions, always. See the header: at ≤899px the band is inside the first fold, so
         intersection alone is not enough to prove the reader has arrived. */
      if (window.scrollY <= SCROLL_GATE) return;
      if (!nearEnough()) return;
      done = true;
      setActive(true);
      cleanup();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) tryMount();
      },
      /* No margin: a margin would fire on the band while it is still a viewport away, which is the
         "almost in view still renders" cost this gate exists to avoid. */
      { rootMargin: "0px", threshold: 0.01 },
    );

    const cleanup = () => {
      observer.disconnect();
      window.removeEventListener("scroll", tryMount);
      window.removeEventListener("resize", tryMount);
    };

    observer.observe(host);
    window.addEventListener("scroll", tryMount, { passive: true });
    window.addEventListener("resize", tryMount);
    /* The observer's initial callback is asynchronous; a reader who reloads mid-page (browsers
       restore the scroll offset) would otherwise wait for the next scroll tick. */
    tryMount();

    return () => {
      done = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (active && painted) host.dataset.foil = "on";
    else delete host.dataset.foil;
    host.dataset.foilState = active ? "active" : "idle";
  }, [active, painted]);

  return (
    <div ref={hostRef} className={styles.canvas} data-foil-state="idle">
      <Depth className={styles.drift} y={-26} scale={0.07} data-layer="monogram-still">
        <div className={styles.stillLayer}>
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
      {/*
        The foil lives in its own layer, outside the parallax transform: the still drifts with the
        scroll, the material does not. A highlight that travelled with the photograph would read as
        a picture of foil rather than as foil.
      */}
      {active ? (
        <div className={styles.foilLayer}>
          <Suspense fallback={null}>
            <Foil onPainted={onPainted} />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}
