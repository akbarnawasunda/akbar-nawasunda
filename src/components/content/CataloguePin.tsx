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
 * Under 768px the pin dissolves: the wrapper loses its height, the row becomes a column, and the
 * catalogue reads vertically like the rest of the page — a thumb should swipe the page, not fight
 * a hijacked axis.
 *
 * Mobile (max-width: 640px): 2-level layout — cover 40×40 + title on top, tag/year/BUKA on bottom.
 * Watermark adjusts to clamp(2rem, 8vw, 3rem).
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
      <div className={styles.pinContent}>
        {items.map((item, index) => (
          <article className={styles.pinCard} key={item.slug} data-pin-card>
            {/* Watermark index number — giant, right-aligned, behind content.
                The number lives in data-index and is painted by ::before: it is pure decoration,
                and a real text node at 4% opacity is correctly flagged by axe's colour-contrast
                rule (a watermark can never meet 3:1). Generated content is not a text node. */}
            <span
              className={styles.ledgerIndexWatermark}
              data-index={String(index + 1).padStart(2, "0")}
              aria-hidden="true"
            />
            <Link className={styles.pinLink} href={item.href} aria-label={`Buka rilis ${item.title}`}>
              {/* Mobile: cover wrapper for 40x40 layout */}
              <span className={styles.coverWrapper}>
                <ReleaseCover artwork={item.artwork} title={item.title} showTitle={false} />
              </span>
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