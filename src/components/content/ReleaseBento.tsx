import Link from "next/link";

import { anMark } from "@/assets/web";
import type { ReleaseView } from "@/content/release-view";
import styles from "./ReleaseBento.module.css";

interface ReleaseBentoProps {
  /** Newest verified release: the wide 16:9 card. */
  featured: ReleaseView;
  /** Remaining verified releases: square tiles, plus one wide tile before the CTA. */
  rest: readonly ReleaseView[];
  /** Verified release count, shown in the featured card's nested stats. */
  total: number;
  /** First year the artist was active, shown in the featured card's nested stats. */
  since: number;
}

/**
 * Music bento (reference 3, KONAV): one 16:9 featured card, four 1:1 tiles, one wide tile and a CTA
 * tile — an asymmetric composition rather than six identical centred cards.
 *
 * Artwork is only shown when a cover file exists (public/assets/covers/<slug>.*). Until then the
 * card carries the AN mark at 10% as a watermark on the surface colour: a real brand asset used as
 * texture, not invented cover art.
 */
export function ReleaseBento({ featured, rest, total, since }: ReleaseBentoProps) {
  const squares = rest.slice(0, 4);
  const wide = rest.slice(4, 5);

  return (
    <div className={styles.bento}>
      <article className={`${styles.card} ${styles.featured}`}>
        <Link href={featured.href} className={styles.hitArea} aria-label={`${featured.title} — buka rilis`}>
          <span className={styles.featuredMedia}>
            {featured.coverUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element -- owner-uploaded 1:1 file */
              <img src={featured.coverUrl} alt="" width={1200} height={675} loading="lazy" decoding="async" />
            ) : (
              <span className={styles.ghost} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element -- 13 KB brand mark used as texture */}
                <img src={anMark.src} alt="" width={anMark.width} height={anMark.height} loading="lazy" />
              </span>
            )}
          </span>

          <span className={styles.featuredBody}>
            <span className={styles.kicker}>
              <span className={styles.kickerDot} aria-hidden="true" />
              Rilis terbaru
            </span>
            <span className={styles.featuredTitle}>{featured.title}</span>
            <span className={styles.meta}>{featured.meta}</span>

            <span className={styles.nested} aria-hidden="true">
              <span className={styles.nestedItem}>
                <span className={styles.nestedValue}>{String(total).padStart(2, "0")}</span>
                <span className={styles.nestedLabel}>Rilis terverifikasi</span>
              </span>
              <span className={styles.nestedItem}>
                <span className={styles.nestedValue}>{since}</span>
                <span className={styles.nestedLabel}>Aktif sejak</span>
              </span>
            </span>

            <span className={styles.openRow}>
              <span className={styles.openLabel}>Buka rilis</span>
              <span aria-hidden="true">↗</span>
            </span>
          </span>
        </Link>
      </article>

      {squares.map((item, index) => (
        <article key={item.slug} className={`${styles.card} ${styles.tile}`}>
          <Link href={item.href} className={styles.hitArea} aria-label={`${item.title} — buka rilis`}>
            <Media release={item} />
            <span className={styles.tileBody}>
              <span className={styles.tileIndex}>{String(index + 2).padStart(2, "0")}</span>
              <span className={styles.tileTitle}>{item.title}</span>
              <span className={styles.meta}>{item.meta}</span>
            </span>
          </Link>
        </article>
      ))}

      {wide.map((item) => (
        <article key={item.slug} className={`${styles.card} ${styles.tileWide}`}>
          <Link href={item.href} className={styles.hitArea} aria-label={`${item.title} — buka rilis`}>
            <Media release={item} />
            <span className={styles.tileBody}>
              <span className={styles.tileIndex}>{String(rest.length + 1).padStart(2, "0")}</span>
              <span className={styles.tileTitle}>{item.title}</span>
              <span className={styles.meta}>{item.meta}</span>
            </span>
          </Link>
        </article>
      ))}

      <article className={`${styles.card} ${styles.cta}`}>
        <Link href="/music" className={styles.hitArea}>
          <span className={styles.ctaBody}>
            <span className={styles.tileTitle}>Katalog lengkap</span>
            <span className={styles.meta}>Semua rilis &amp; catatan</span>
          </span>
          <span className={styles.ctaArrow} aria-hidden="true">
            →
          </span>
        </Link>
      </article>
    </div>
  );
}

function Media({ release }: { release: ReleaseView }) {
  if (release.coverUrl) {
    return (
      <span className={styles.media}>
        {/* eslint-disable-next-line @next/next/no-img-element -- owner-uploaded 1:1 file */}
        <img src={release.coverUrl} alt="" width={600} height={600} loading="lazy" decoding="async" />
      </span>
    );
  }
  return (
    <span className={`${styles.media} ${styles.mediaGhost}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- 13 KB brand mark used as texture */}
      <img src={anMark.src} alt="" width={anMark.width} height={anMark.height} loading="lazy" />
    </span>
  );
}
