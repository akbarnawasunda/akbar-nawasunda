"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import styles from "./CatalogueIndex.module.css";

export interface IndexRow {
  slug: string;
  /** Printed ordinal, "01"–"10". The owner's file order, so it never renumbers by itself. */
  ordinal: string;
  href: string;
  title: string;
  /** Original artist, year and format, already assembled by the page from verified fields. */
  meta: string;
  sleeve: string | null;
}

/**
 * The catalogue as a typographic index, not a grid of cards.
 *
 * Ten releases in five equal boxes says "template"; ten releases as ten rows of 56 px serif says
 * "discography". The rows carry the information the cards were carrying — index, title, artist,
 * year, format — and the sleeve only appears when the reader asks for it, following the pointer.
 *
 * Behaviour that matters:
 * - the preview is `position: fixed` and moved with `translate` from a ref, so pointer movement
 *   never touches layout and never re-renders React;
 * - keyboard users get the same preview on `focus`, anchored to the row instead of the pointer, so
 *   the mouse is not required to see the artwork;
 * - the sleeve is decorative here (the row already names the release), so it is `aria-hidden` and
 *   never enters the accessibility tree twice;
 * - rows are links, so middle-click, open-in-new-tab and the status bar all work.
 */
/** Where the sleeve sits relative to the pointer: above and to the right, never over the row. */
const PREVIEW_OFFSET = { x: 40, y: -170 };

export function CatalogueIndex({ rows }: { rows: readonly IndexRow[] }) {
  const [active, setActive] = useState<string | null>(null);
  const previewRef = useRef<HTMLSpanElement | null>(null);
  const frame = useRef(0);
  const point = useRef({ x: 0, y: 0 });

  const place = useCallback(() => {
    frame.current = 0;
    const node = previewRef.current;
    if (!node) return;
    node.style.transform = `translate3d(${point.current.x}px, ${point.current.y}px, 0)`;
  }, []);

  /**
   * The preview sits **above and to the right** of the pointer, not under it. Centred on the cursor
   * it covered the title of the row being read, which turns a nice interaction into an obstacle: you
   * hover a release and the release name disappears behind its own cover.
   */
  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLUListElement>) => {
      point.current = { x: event.clientX + PREVIEW_OFFSET.x, y: event.clientY + PREVIEW_OFFSET.y };
      if (frame.current) return;
      frame.current = requestAnimationFrame(place);
    },
    [place],
  );

  const onFocus = useCallback((slug: string, event: React.FocusEvent<HTMLAnchorElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    // Keyboard: anchor to the end of the focused row instead of a pointer that is not moving.
    point.current = { x: rect.right - 300, y: rect.top - 120 };
    setActive(slug);
    requestAnimationFrame(place);
  }, [place]);

  const current = rows.find((row) => row.slug === active) ?? null;

  return (
    <div className={styles.wrap}>
      <ul
        className={styles.list}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setActive(null)}
      >
        {rows.map((row) => (
          <li key={row.slug} className={styles.row}>
            <Link
              href={row.href}
              className={styles.link}
              data-index-row={row.slug}
              onPointerEnter={() => setActive(row.slug)}
              onFocus={(event) => onFocus(row.slug, event)}
              onBlur={() => setActive(null)}
            >
              <span className={styles.ordinal} aria-hidden="true">
                {row.ordinal}
              </span>
              <span className={styles.title}>{row.title}</span>
              <span className={styles.meta}>{row.meta}</span>
              <span className={styles.arrow} aria-hidden="true">
                ↗
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* One preview element for the whole list: no ten hidden images, no layout work per hover. */}
      <span
        ref={previewRef}
        className={styles.preview}
        data-visible={current ? "true" : "false"}
        aria-hidden="true"
      >
        <span className={styles.previewStage}>
          {current?.sleeve ? (
            /* eslint-disable-next-line @next/next/no-img-element -- 7 KB sleeve, exact bytes, no resize needed */
            <img src={current.sleeve} alt="" width={260} height={260} decoding="async" />
          ) : null}
        </span>
      </span>
    </div>
  );
}
