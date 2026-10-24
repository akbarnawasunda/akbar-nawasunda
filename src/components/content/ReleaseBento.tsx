import Link from "next/link";

import type { ReleaseView } from "@/content/release-view";
import type { CoverArtwork } from "@/content/covers";

import { ReleaseCover } from "./ReleaseCover";
import styles from "./ReleaseBento.module.css";

export interface BentoItem extends ReleaseView {
  artwork: CoverArtwork;
}

interface ReleaseBentoProps {
  /** Newest verified release: the wide 16:9 card. */
  featured: BentoItem;
  /** Remaining verified releases: 1:1 tiles, three per row on desktop. */
  rest: readonly BentoItem[];
  /** Verified release count, shown as the catalogue total on the featured card. */
  total: number;
}

/**
 * Music bento: one 16:9 card and five 1:1 tiles on a 12-column grid with 16px gaps.
 *
 * Every card is artwork-first. When the owner has not uploaded a file the sleeve is generated from
 * the title, the mark and the palette (ReleaseCover), so no cell is an empty typographic box — the
 * rule the previous version broke. The grid closes with a dashed "semua rilis" cell because five
 * tiles leave four columns empty on the second row.
 */
export function ReleaseBento({ featured, rest, total }: ReleaseBentoProps) {
  const tiles = rest.slice(0, 5);

  return (
    <div className={styles.bento}>
      <article className={`${styles.card} ${styles.featured}`}>
        {/* No aria-label: axe's label-content-name-mismatch rule requires the accessible name to
            contain the visible text, and this card shows the title, the meta and "Buka rilis". The
            content already reads correctly, so it is left to speak for itself. */}
        <Link href={featured.href} className={styles.hitArea}>
          <span className={styles.featuredCover}>
            {/* Not priority: the card sits below the hero, and preloading it competed with the LCP portrait. */}
            <ReleaseCover artwork={featured.artwork} title={featured.title} shape="wide" showTitle={false} />
          </span>

          <span className={styles.featuredBody}>
            <span className={styles.kicker}>
              <span className={styles.kickerDot} aria-hidden="true" />
              Rilis terbaru
            </span>
            <span className={styles.featuredTitle}>{featured.title}</span>
            {/* Decorative waveform: bars, no numbers, so it cannot be read as stream data. */}
            <span className={styles.wave} aria-hidden="true">
              {Array.from({ length: 28 }, (_, index) => (
                <span key={index} style={{ height: `${18 + ((index * 37) % 62)}%` }} />
              ))}
            </span>
            <span className={styles.meta}>{featured.meta}</span>
            <span className={styles.count}>{String(total).padStart(2, "0")} rilis terverifikasi</span>

            <span className={styles.openRow}>
              <span>Buka rilis</span>
              <span aria-hidden="true">↗</span>
            </span>
          </span>

          <span className={styles.overlay} aria-hidden="true">
            Buka rilis <span>↗</span>
          </span>
        </Link>
      </article>

      {tiles.map((item, index) => (
        <article key={item.slug} className={`${styles.card} ${styles.tile}`}>
          <Link href={item.href} className={styles.hitArea}>
            <ReleaseCover artwork={item.artwork} title={item.title} showTitle={false} />
            <span className={styles.tileBody}>
              <span className={styles.tileIndex}>{String(index + 2).padStart(2, "0")}</span>
              {/* The generated sleeve prints the title inside the artwork, so the scrim only
                  carries the index and the verified meta. Real artwork gets the title here. */}
              {item.artwork.kind === "image" ? (
                <span className={styles.tileTitle}>{item.title}</span>
              ) : null}
              <span className={styles.meta}>{item.meta}</span>
            </span>
            <span className={styles.overlay} aria-hidden="true">
              Buka rilis <span>↗</span>
            </span>
          </Link>
        </article>
      ))}

      <article className={`${styles.card} ${styles.more}`}>
        <Link href="/music" className={styles.moreLink}>
          <span className={styles.moreLabel}>Katalog lengkap</span>
          <span className={styles.moreArrow} aria-hidden="true">
            →
          </span>
        </Link>
      </article>
    </div>
  );
}
