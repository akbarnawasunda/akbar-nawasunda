"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { registerPin } from "@/components/zine/scroll-engine";

import styles from "./ReleaseTicker.module.css";

export interface TickerItem {
  slug: string;
  title: string;
  meta: string;
}

/**
 * The catalogue, printed as a running head.
 *
 * This is the site's signature band: one line of release titles set in display type, moving
 * horizontally as the reader scrolls — a news crawl tied to the page rather than to a timer. Three
 * decisions make it behave:
 *
 * 1. **It is scrubbed by the scroll, not animated on a loop.** There is no `animation: infinite`
 *    anywhere on this page (tests/fixtures/anti-ai.ts forbids endless decoration, and it is right:
 *    a marquee that never stops is the cheapest way to look busy). The band translates with the
 *    reader, so it is always in the same place when they look back.
 * 2. **It is navigation.** Every entry links to its release page; the duplicate copy that makes the
 *    crawl seamless is `aria-hidden` and untabbable, so the tab order has ten items, not twenty.
 * 3. **It stops being a crawl when the reader asked for stillness.** Reduced motion registers
 *    nothing and the band shows the first titles, static, still clickable.
 */
export function ReleaseTicker({ items }: { items: readonly TickerItem[] }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return registerPin(node, { property: "--ticker", mode: "travel" });
  }, []);

  const run = (copy: number) => (
    <ul className={styles.run} aria-hidden={copy === 1 ? "true" : undefined}>
      {items.map((item, index) => (
        <li key={`${copy}-${item.slug}`} className={styles.item}>
          <Link href={`/music/${item.slug}`} tabIndex={copy === 1 ? -1 : undefined} className={styles.link}>
            <span className={styles.title}>{item.title}</span>
            <span className={styles.meta}>{item.meta}</span>
          </Link>
          {index < items.length - 1 ? (
            <span className={styles.sep} aria-hidden="true" />
          ) : null}
        </li>
      ))}
    </ul>
  );

  return (
    <div className={styles.band} ref={ref} data-ticker>
      <p className={styles.label}>
        <span className={styles.dot} aria-hidden="true" />
        Katalog
      </p>
      <div className={styles.viewport}>
        <div className={styles.track}>
          {run(0)}
          {run(1)}
        </div>
      </div>
    </div>
  );
}
