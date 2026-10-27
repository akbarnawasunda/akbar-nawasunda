import Link from "next/link";

import { ReleaseCover } from "./ReleaseCover";
import type { CoverArtwork } from "@/content/covers";

import styles from "./ReleaseLedger.module.css";

/**
 * The discography, as a ledger rather than a wall of cards.
 *
 * Round 37, owner's brief: "clean audio reel … list tabular atau grid yang elegan dengan baris
 * pemisah 1px". A card grid gives every release the same cell and therefore the same importance; a
 * ledger reads top to bottom like a running order, and the hairline between rows is the only
 * furniture it needs.
 *
 * Each row is: catalogue number · sleeve · title (+ type · year) · open link. The whole row is one
 * link, named by `aria-label`, and the sleeve inside it is decorative (`alt=""`) — the same rule
 * round 35.1 established for the grid: a link's visible text and its accessible name may not
 * disagree, so the artwork carries no second name.
 *
 * Nothing here is absolutely positioned and no row overlaps another: `grid` rows in the normal flow,
 * a `border-top` on each item, and one hover translate on the link.
 */
export interface LedgerItem {
  slug: string;
  href: string;
  title: string;
  /** Verified year, or null. Printed as "—", never guessed. */
  year: number | null;
  /** "Single", "Remix", "EP", … */
  format: string;
  artwork: CoverArtwork;
}

interface ReleaseLedgerProps {
  items: readonly LedgerItem[];
  /** Where the numbering starts — the spotlight above has already taken TRACK 01. */
  startAt?: number;
}

export function ReleaseLedger({ items, startAt = 2 }: ReleaseLedgerProps) {
  if (items.length === 0) return null;

  return (
    <ol className={styles.ledger}>
      {items.map((item, index) => (
        <li key={item.slug} className={styles.row} data-release={item.slug}>
          <span className={styles.number} aria-hidden="true">
            {String(startAt + index).padStart(2, "0")}
          </span>

          {/*
            No `aria-label` here, and that is the point: the row prints its own title, format and year,
            so those words ARE the link's accessible name. Naming the link "Buka rilis <title>" while
            the title is also visible inside it fails WCAG 2.5.3 (label in name) — the rule round 35.1
            learned the hard way on the card grid. The sleeve inside is decorative (`alt=""`), so the
            name is exactly the text a sighted visitor reads.
          */}
          <Link href={item.href} className={styles.rowLink}>
            <span className={styles.sleeve}>
              <ReleaseCover artwork={item.artwork} title={item.title} showTitle={false} alt="" />
            </span>
            <span className={styles.copy}>
              <span className={styles.title}>{item.title}</span>
              <span className={styles.meta}>
                {item.format}
                <span aria-hidden="true"> · </span>
                {item.year ?? "—"}
              </span>
            </span>
            <span className={styles.open} aria-hidden="true">
              Buka
              <span className={styles.arrow}>↗</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
