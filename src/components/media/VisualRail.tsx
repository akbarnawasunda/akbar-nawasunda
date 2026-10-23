import Image from "next/image";

import type { VisualItem } from "@/components/media/VisualGrid";

import styles from "./VisualRail.module.css";

/**
 * Horizontal archive rail: six real files, one per panel, with the source aspect ratio kept.
 *
 * A rail rather than a grid because the archive reads as a contact sheet being pulled across a
 * table. It is a native scroll container — no drag library, no scroll hijack, no pin — so it works
 * with a trackpad, a touch screen, a keyboard (the container is focusable) and with JS off.
 */
export function VisualRail({ items }: { items: readonly VisualItem[] }) {
  return (
    <div className={styles.wrap}>
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
  );
}
