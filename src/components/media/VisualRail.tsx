"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import type { VisualItem } from "@/components/media/VisualGrid";
import { registerPin } from "@/components/zine/scroll-engine";

import styles from "./VisualRail.module.css";

/**
 * Horizontal archive rail: six real files, one per panel, with the source aspect ratio kept.
 *
 * On a wide screen the rail is *pinned* — the band is three viewports tall, the rail sticks to the
 * top, and vertical scrolling drags it sideways. The first version of this used `view-timeline` in
 * CSS, which was elegant and wrong: view timelines are Chromium 115+ (Safari only reached them in
 * 26), so on most phones and on desktop Firefox the rail never moved at all. The band now asks the
 * site's single scroll loop for a 0→1 pin value and the CSS turns it into `translate`
 * (D-116) — the same maths in every engine, and the browser still does the compositing.
 *
 * Nothing is hidden behind the animation: the rail keeps `tabIndex` and stays scrollable, so the
 * panels are reachable with a keyboard or a screen reader at any scroll position.
 */
export function VisualRail({ items }: { items: readonly VisualItem[] }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  /**
   * `data-pinned` is the switch: the tall band and the sticky stage only exist once the loop is
   * actually driving them. If JS never runs (or the reader asked for reduced motion) the rail keeps
   * its natural height and stays an ordinary horizontal scroll container, which is the readable
   * fallback rather than a three-screen-tall empty band.
   */
  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    node.dataset.pinned = "true";
    const release = registerPin(node, { property: "--rail-pin" });
    return () => {
      release();
      delete node.dataset.pinned;
    };
  }, []);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <div className={styles.stage}>
        <div
          className={styles.rail}
          role="group"
          aria-label="Arsip visual — geser horizontal"
          tabIndex={0}
        >
        {items.map((item, index) => (
          <figure key={item.id} className={styles.panel}>
            {/* The frame owns the crop and the screen; the caption is a row underneath, not a band
                laid over the photograph. */}
            <span className={styles.frame}>
              <Image
                className={item.onSurface ? `${styles.media} ${styles.onSurface}` : styles.media}
                src={item.src}
                alt={item.alt}
                width={640}
                height={800}
                sizes="(min-width: 1024px) 30vw, 78vw"
                loading={index < 2 ? "eager" : "lazy"}
              />
            </span>
            <figcaption className={styles.caption}>
              <span className={styles.index} aria-hidden="true">
                {String(index + 1).padStart(3, "0")}
              </span>
              {item.caption}
            </figcaption>
          </figure>
        ))}
        </div>
        <p className={styles.hint} aria-hidden="true">
          Geser <span>→</span>
        </p>
      </div>
    </div>
  );
}
