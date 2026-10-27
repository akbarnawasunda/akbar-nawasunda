import Link from "next/link";

import { ReleaseCover } from "./ReleaseCover";
import type { CoverArtwork } from "@/content/covers";

import styles from "./ReleaseGrid.module.css";

/**
 * One release, as a card on a sharp grid — the homepage's catalogue.
 *
 * Round 35: this replaces the pinned horizontal reel. The reel was a beautiful thing and a fragile
 * one: 300vh of scroll, a sticky row, a translateX written by the engine. If the engine did not boot,
 * or the section was entered at a scroll position it did not expect, the sleeves sat outside the
 * viewport and the front page looked like it had no releases at all. A grid cannot fail that way —
 * it is in the document flow, it is server-rendered, and every sleeve is visible without a single
 * line of JavaScript.
 *
 * The rules the owner asked for, literally:
 *
 *   - 0 radius everywhere (no `border-radius` declared at all);
 *   - the artwork is the object: 1:1, full width of its cell, high-resolution source, with the
 *     component's own `#14263A` fallback when a file is missing;
 *   - the title is bold and carries its own link;
 *   - the year and the format are one mono line above it;
 *   - the streaming buttons are real anchors to the owner's pages — Spotify, Apple Music, YouTube
 *     where the release has them, the artist's verified profile where it does not.
 */
export interface ReleaseCard {
  slug: string;
  href: string;
  title: string;
  /** Release year as verified, or null. Printed as "—" when unknown, never guessed. */
  year: number | null;
  /** "Single", "Remix", "EP", … */
  format: string;
  artwork: CoverArtwork;
  /** Ordered streaming destinations. May be empty when nothing official exists. */
  streams: readonly { label: string; href: string }[];
  /** True for the release the spotlight above already features. */
  featured?: boolean;
}

interface ReleaseGridProps {
  items: readonly ReleaseCard[];
}

export function ReleaseGrid({ items }: ReleaseGridProps) {
  if (items.length === 0) return null;

  return (
    <ol className={styles.grid}>
      {items.map((item, index) => (
        <li key={item.slug} className={styles.card} data-release={item.slug}>
          <Link
            href={item.href}
            className={styles.sleeve}
            /* WCAG 2.5.3: every word printed inside the link has to appear in its accessible name.
               The ordinal is already hidden; the "Baru" badge is visual shorthand for the phrase
               below, which is what a screen reader hears instead. */
            aria-label={item.featured ? `Buka rilis ${item.title} — rilis terbaru` : `Buka rilis ${item.title}`}
          >
            <span className={styles.sleeveInner}>
              <ReleaseCover artwork={item.artwork} title={item.title} showTitle={false} />
            </span>
            <span className={styles.ordinal} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            {item.featured ? (
              <span className={styles.flag} aria-hidden="true">
                Baru
              </span>
            ) : null}
          </Link>

          <p className={styles.meta}>
            <span>{item.year ?? "—"}</span>
            <span aria-hidden="true">·</span>
            <span>{item.format}</span>
          </p>

          <h3 className={styles.title}>
            <Link href={item.href}>{item.title}</Link>
          </h3>

          {item.streams.length > 0 ? (
            <ul className={styles.streams} aria-label={`Dengarkan ${item.title}`}>
              {item.streams.map((stream) => (
                <li key={`${item.slug}-${stream.label}`}>
                  <a
                    className={styles.stream}
                    href={stream.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {stream.label}
                    <span className="sr-only"> (membuka tab baru)</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
