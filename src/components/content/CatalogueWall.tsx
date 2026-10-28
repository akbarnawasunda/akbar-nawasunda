"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

import type { CoverArtwork } from "@/content/covers";
import type { ReleaseView } from "@/content/release-view";

import { ReleaseCover } from "./ReleaseCover";
import styles from "./CatalogueWall.module.css";

/**
 * The catalogue as a wall, not a grid.
 *
 * A grid of equal tiles is the shape a page takes when nobody decided anything: nine boxes, same
 * size, same gap, same radius. A wall is the shape a record shop takes — the sleeves are all there
 * at once, but the one you are looking at comes forward.
 *
 * So: the list owns a vanishing point, every sleeve sits on it, and the one under the pointer rises
 * towards the reader while tilting towards the cursor. The neighbours stay flat, which is what makes
 * the movement read as *this object in front of those objects* rather than as a hover animation on
 * one card.
 *
 * The numbers are written to CSS custom properties from one rAF-throttled pointer handler, so the
 * transform work happens on the compositor and React never re-renders while the pointer moves. Rects
 * are read in one batch before any property is written, the same rule the scroll engine follows.
 *
 * Reduced motion: nothing registers. The wall renders as a flat contact sheet, which is the correct
 * resting state — the sleeves are the content, the depth is the courtesy.
 */
const MAX_TILT = 9;
const MAX_LIFT = 44;

/**
 * The artwork is resolved on the server and passed in.
 *
 * It has to be: `coverArtwork` reads the filesystem to find out whether the owner has uploaded a
 * real cover, and importing that function here would pull `node:fs` into the browser bundle — which
 * is exactly what Turbopack refused to build. A client component may import a *type* from that
 * module; it may not import the resolver.
 */
export interface WallItem extends ReleaseView {
  artwork: CoverArtwork;
}

/**
 * `/music` prints the first release as the takeover above the wall and passes the rest here, so
 * `startIndex` keeps both numbers on the wall — the small ordinal and the giant watermark — at
 * their real position in the owner's catalogue rather than restarting at 01.
 */
export function CatalogueWall({ items, startIndex = 0 }: { items: readonly WallItem[]; startIndex?: number }) {
  const listRef = useRef<HTMLOListElement | null>(null);
  const frame = useRef(0);
  const last = useRef<{ x: number; y: number } | null>(null);

  const paint = useCallback(() => {
    frame.current = 0;
    const list = listRef.current;
    const point = last.current;
    if (!list) return;

    const cards = [...list.querySelectorAll<HTMLElement>("[data-wall-card]")];
    // Read pass: every rect before the first write.
    const measurements = cards.map((card) => {
      const rect = card.getBoundingClientRect();
      return { card, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, w: rect.width, h: rect.height };
    });

    for (const { card, cx, cy, w } of measurements) {
      if (!point) {
        card.style.setProperty("--wall-rx", "0deg");
        card.style.setProperty("--wall-ry", "0deg");
        card.style.setProperty("--wall-z", "0px");
        continue;
      }
      const dx = (point.x - cx) / (w * 0.9);
      const dy = (point.y - cy) / (w * 0.9);
      // Only the sleeve being pointed at comes forward. `falloff` is 1 at the centre of a card and
      // reaches 0 one card-width away, so the effect is local and the wall stays legible.
      const distance = Math.min(1, Math.hypot(dx, dy));
      const falloff = Math.max(0, 1 - distance * 1.6);
      card.style.setProperty("--wall-ry", `${(dx * MAX_TILT * falloff).toFixed(2)}deg`);
      card.style.setProperty("--wall-rx", `${(-dy * MAX_TILT * falloff).toFixed(2)}deg`);
      card.style.setProperty("--wall-z", `${(falloff * MAX_LIFT).toFixed(1)}px`);
    }
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (event: PointerEvent) => {
      // Mouse and pen only. Gate on the event rather than on `(hover: none)`, which a headless
      // browser reports even when it is being driven by a real pointer.
      if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      last.current = { x: event.clientX, y: event.clientY };
      if (!frame.current) frame.current = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      last.current = null;
      if (!frame.current) frame.current = requestAnimationFrame(paint);
    };

    list.addEventListener("pointermove", onMove, { passive: true });
    list.addEventListener("pointerleave", onLeave);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      list.removeEventListener("pointermove", onMove);
      list.removeEventListener("pointerleave", onLeave);
    };
  }, [paint]);

  return (
    <ol className={styles.wall} ref={listRef}>
      {items.map((item, index) => (
        <li key={item.slug} className={styles.cell}>
          {/* Ledger watermark: the same giant index the homepage reel carries, behind the sleeve.
              data-index + ::before keeps it out of axe's colour-contrast text scan. */}
          <span
            className={styles.ledgerIndexWatermark}
            data-index={String(startIndex + index + 1).padStart(2, "0")}
            aria-hidden="true"
          />
          <Link href={item.href} className={styles.card} data-wall-card={item.slug}>
            <span className={styles.sleeve}>
              <ReleaseCover artwork={item.artwork} title={item.title} showTitle={false} />
            </span>
            <span className={styles.under}>
              <span className={styles.ordinal} aria-hidden="true">
                {String(startIndex + index + 1).padStart(2, "0")}
              </span>
              <span className={styles.title}>{item.title}</span>
              <span className={styles.meta}>{item.meta}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
