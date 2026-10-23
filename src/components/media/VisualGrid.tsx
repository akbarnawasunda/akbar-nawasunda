"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./VisualGrid.module.css";

export interface VisualItem {
  id: string;
  /** Grid thumbnail: small enough to paint fast on a phone. */
  src: string;
  /** Lightbox image; falls back to `src` when omitted. */
  full?: string;
  /** Displayed under the tile and used as the lightbox label. */
  caption: string;
  /** Informative alt text; empty for decorative tiles. */
  alt: string;
  /** True when the artwork is a mark on a flat surface rather than a photograph. */
  onSurface?: boolean;
}

interface VisualGridProps {
  items: readonly VisualItem[];
  /**
   * "grid" is the homepage 2x2 block with a staggered second column.
   * "masonry" is the archive layout: CSS columns, tiles keep their own aspect ratio.
   */
  variant?: "grid" | "masonry";
}

/**
 * Visual archive preview: a 2x2 grid of real assets with a lightweight lightbox.
 *
 * The lightbox is native DOM plus three behaviours: Escape closes, the close button takes focus when
 * it opens, and focus returns to the tile that opened it. It is the only interactive client island
 * on the homepage besides the header, so it stays small.
 */
export function VisualGrid({ items, variant = "grid" }: VisualGridProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpenId(null);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!openId) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openId, close]);

  const open = items.find((item) => item.id === openId) ?? null;

  return (
    <>
      <ul className={variant === "masonry" ? `${styles.grid} ${styles.masonry}` : styles.grid}>
        {items.map((item) => (
          <li key={item.id} className={item.onSurface ? styles.surfaceTile : styles.photoTile}>
            <button
              type="button"
              className={styles.trigger}
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setOpenId(item.id);
              }}
              aria-label={`Perbesar: ${item.caption}`}
            >
              {/*
                Eager, low priority. The four thumbnails total ~100 KB (27/33/13/33), and they are
                the content of this section rather than decoration: lazy-loading them leaves blank
                tiles in some Android in-app browsers and when a page is printed or captured. They
                are fetched after the LCP image, which is above the fold and high priority.
              */}
              {/* eslint-disable-next-line @next/next/no-img-element -- fixed local assets, exact bytes */}
              <img
                src={item.src}
                alt={item.alt}
                width={480}
                height={480}
                loading="eager"
                fetchPriority="low"
                decoding="async"
              />
              <span className={styles.caption}>{item.caption}</span>
              <span className={styles.expand} aria-hidden="true">
                ⤢
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open ? (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={open.caption}>
          <button type="button" className={styles.backdrop} onClick={close} aria-label="Tutup" tabIndex={-1} />
          <figure className={styles.lightbox}>
            {/* eslint-disable-next-line @next/next/no-img-element -- fixed local assets, exact bytes */}
            <img src={open.full ?? open.src} alt={open.alt} width={1200} height={1200} />
            <figcaption className={styles.lightboxCaption}>{open.caption}</figcaption>
          </figure>
          <button ref={closeRef} type="button" className={styles.close} onClick={close}>
            Tutup <span aria-hidden="true">✕</span>
          </button>
        </div>
      ) : null}
    </>
  );
}
