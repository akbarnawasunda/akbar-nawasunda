import Image from "next/image";

import type { VisualItem } from "@/components/media/VisualGrid";

import styles from "./VisualRail.module.css";

/**
 * Horizontal archive rail: six real files, one per panel, with the source aspect ratio kept.
 *
 * On a wide screen the rail is *pinned* — the band is three viewports tall, the rail sticks to the
 * top, and vertical scrolling drags it sideways. That is done with `view-timeline` in CSS, not with
 * a scroll library: the browser owns the maths, the effect runs on the compositor, and if the
 * feature is missing the band simply stays a normal horizontal scroll container (the phone layout,
 * where horizontal scrolling is the native gesture anyway).
 *
 * Nothing is hidden behind the animation: the rail keeps `tabIndex` and stays scrollable, so the
 * panels are reachable with a keyboard or a screen reader at any scroll position.
 */
export function VisualRail({ items }: { items: readonly VisualItem[] }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.stage}>
        <div
          className={styles.rail}
          role="group"
          aria-label="Arsip visual — geser horizontal"
          tabIndex={0}
        >
        {items.map((item, index) => (
          <figure key={item.id} className={styles.panel}>
            <span className={styles.index} aria-hidden="true">
              {String(index + 1).padStart(3, "0")}
            </span>
            <Image
              className={item.onSurface ? `${styles.media} ${styles.onSurface}` : styles.media}
              src={item.src}
              alt={item.alt}
              width={640}
              height={800}
              sizes="(min-width: 1024px) 30vw, 78vw"
              loading={index < 2 ? "eager" : "lazy"}
            />
            <figcaption className={styles.caption}>{item.caption}</figcaption>
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
