"use client";

import Image from "next/image";

import type { CSSProperties } from "react";

import type { VisualItem } from "@/components/media/VisualGrid";

import styles from "./VisualRail.module.css";

/**
 * The homepage archive wall.
 *
 * It was a horizontally pinned rail for three rounds: a 300vh band that stuck to the top while
 * vertical scrolling dragged six photographs sideways. That was a good demonstration of the site's
 * single scroll loop and a bad page — on a 1440×900 laptop it produced two full screens of black
 * between the last panel and the next section, because the pin needed the height and the photographs
 * did not. The reference is a wall: every asset visible, aligned, monochrome, captioned underneath.
 *
 * So: a grid, no pin, no client state, no scroll listener. Six real owner files; the mark and lockup
 * sit on a surface step because they are line art on transparency, not photographs.
 */
export function VisualRail({ items }: { items: readonly VisualItem[] }) {
  return (
    <div className={styles.wall}>
      <ul className={styles.grid} aria-label="Arsip visual">
        {items.map((item, index) => (
          <li key={item.id} className={styles.panel}>
            <figure className={styles.figure}>
              <span
                className={styles.frame}
                data-shape={item.shape ?? "portrait"}
                style={
                  // Per-asset value, not a token: the frame is the artwork's own ratio so a 1.55:1
                  // monogram is not cut into a 4:5 box it never had.
                  item.shape === "landscape"
                    ? ({ aspectRatio: `${item.width} / ${item.height}` } as CSSProperties)
                    : undefined
                }
              >
                <Image
                  className={item.onSurface ? `${styles.media} ${styles.onSurface}` : styles.media}
                  src={item.src}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  sizes="(min-width: 1024px) 30vw, 78vw"
                  loading={index < 3 ? "eager" : "lazy"}
                />
              </span>
              <figcaption className={styles.caption}>
                <span className={styles.index} aria-hidden="true">
                  {String(index + 1).padStart(3, "0")}
                </span>
                {item.caption}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}
