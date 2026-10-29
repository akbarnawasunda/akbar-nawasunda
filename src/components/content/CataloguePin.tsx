"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import type { CoverArtwork } from "@/content/covers";
import { registerPin } from "@/components/zine/scroll-engine";

import { Scramble } from "@/components/zine/Scramble";

import { ReleaseCover } from "./ReleaseCover";
import styles from "./CataloguePin.module.css";

/**
 * Round 29 — the catalogue as a pinned horizontal reel, on the owner's spec:
 * a 300vh wrapper, a sticky 100vh flex row, and the page's own scroll engine turning the pinned
 * travel into `--pin` (0 → 1), which the stylesheet converts into one `translateX`. No second
 * rAF loop, no scroll hijacking: the vertical scrollbar stays the reader's, the engine writes a
 * single custom property per frame it already runs, and CSS does the maths
 * (`translateX(calc(var(--pin) * (100vw - 100%)))`).
 *
 * Under 768px the pin dissolves, but the row does not become a column: round 31 kept it
 * horizontal and handed the axis to the thumb instead. The wrapper loses its height, the sticky
 * row becomes a native scroller (`overflow-x: auto` + `scroll-snap-type: x mandatory`), so a
 * swipe glides sleeve to sleeve while a vertical drag still belongs to the page — one axis per
 * gesture, the way iOS and Android both expect. The overhang stays clipped to the row, so the
 * document never gains a horizontal scrollbar.
 */
export interface CataloguePinItem {
  slug: string;
  href: string;
  title: string;
  meta: string;
  artwork: CoverArtwork;
}

export function CataloguePin({ items }: { items: CataloguePinItem[] }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    return registerPin(wrap, { property: "--pin", mode: "pin" });
  }, []);

  return (
    <div ref={wrapRef} className={styles.pinWrap} data-catalogue-pin>
      <div className={styles.pinContent} data-stagger="on">
        {items.map((item) => (
          <article className={styles.pinCard} key={item.slug} data-pin-card>
            <Link className={styles.pinLink} href={item.href} aria-label={`Buka rilis ${item.title}`}>
              <ReleaseCover artwork={item.artwork} title={item.title} showTitle={false} />
            </Link>
            <p className={styles.pinTitle}>
              <Scramble text={item.title} />
            </p>
            <p className={styles.pinMeta}>{item.meta}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
