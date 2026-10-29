"use client";

import Link from "next/link";

import { useRef, type PointerEvent } from "react";

import type { LedgerRow } from "@/content/release-ledger";

import { ReleaseCover } from "./ReleaseCover";
import styles from "./ReleaseLedger.module.css";

/**
 * The catalogue as a ledger (Langkah 3n, closing 3d).
 *
 * Six columns per release: ordinal, sleeve, title, type, year, streaming status. One hairline
 * between rows, right angles, no shadow, no card. The row is the whole link target, because on a
 * catalogue whose rows are 76px tall the natural gesture is to hit the line, not the 20 characters
 * inside it.
 *
 * Why this is a client component when it renders server-decided data: the pointer pool. A
 * *mechanical* ledger does not lift or tilt — hovering a row nudges it 6px and lights a rule, which
 * css can do alone. What css cannot do is know that a fast pointer is crossing the list, and the one
 * thing this table borrows from a shop is that the row under the pointer reads as selected. So a
 * single `pointermove` handler writes `data-hot` on the row under the pointer and clears it on the
 * others. No state, no re-render, one attribute swap; the shift itself stays in css and therefore
 * respects `prefers-reduced-motion` in the same place every other transition does.
 *
 * Below 720px the row stacks into three lines instead of pretending to be a table with seven
 * columns. Nothing is hidden: type, year and status all still print, because a field that disappears
 * exactly where the screen is smallest is the one field a reader cannot go and look up elsewhere.
 */
export function ReleaseLedger({ rows }: { rows: readonly LedgerRow[] }) {
  const listRef = useRef<HTMLOListElement | null>(null);

  function trackPointer(event: PointerEvent<HTMLOListElement>) {
    const list = listRef.current;
    if (!list) return;
    if (event.pointerType !== "mouse") return;
    /* `closest` from the event target, not `event.target.closest` — the target can be a text node's
       element or an <img>, and the row attr has to land on the <li> either way. */
    const target = event.target as HTMLElement | null;
    const row = target?.closest<HTMLElement>("[data-ledger-row]") ?? null;
    for (const element of list.querySelectorAll<HTMLElement>("[data-ledger-row]")) {
      if (element === row) element.dataset.hot = "true";
      else delete element.dataset.hot;
    }
  }

  function clearPointer() {
    const list = listRef.current;
    if (!list) return;
    for (const element of list.querySelectorAll<HTMLElement>("[data-ledger-row]")) {
      delete element.dataset.hot;
    }
  }

  return (
    <ol
      ref={listRef}
      className={styles.ledger}
      data-stagger="on"
      aria-label="Katalog rilis"
      onPointerMove={trackPointer}
      onPointerLeave={clearPointer}
    >
      {rows.map((row) => (
        <li key={row.slug} className={styles.row} data-ledger-row>
          <Link className={styles.rowLink} href={row.href} data-ledger-link>
            <span className={styles.ordinal}>{row.ordinal}</span>

            {/* The sleeve is the one image in the row, and it is the row's own identifier. It is
                decorative inside the link: the accessible name comes from the title text, and an
                alt here would make a screen reader read the artwork filename twice. */}
            <span className={styles.thumb} aria-hidden="true">
              <ReleaseCover artwork={row.artwork} title={row.title} showTitle={false} />
            </span>

            <span className={styles.title}>{row.title}</span>

            <span className={styles.detail}>
              <span className={styles.type}>{row.type}</span>
              <span className={styles.year}>{row.year}</span>
            </span>

            {/*
              Status, not a second link. `streaming.href` is this row's own destination for an
              unrecorded release, and a nested anchor inside the row link would be invalid html — so
              the row prints the label and the row's link goes where the status points. The value is
              still `releaseStreamingStatus()`'s, never a label typed here (Langkah 3m).
            */}
            <span
              className={styles.stream}
              data-streaming={row.streaming.recorded ? "recorded" : "unrecorded"}
            >
              {row.streaming.label}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
