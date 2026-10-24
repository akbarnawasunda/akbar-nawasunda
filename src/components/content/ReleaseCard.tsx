import Link from "next/link";

import { coverArtwork } from "@/content/covers";
import type { ReleaseView } from "@/content/release-view";

import { ReleaseCover } from "./ReleaseCover";
import styles from "./ReleaseCard.module.css";

interface ReleaseCardProps {
  release: ReleaseView;
  /** 1-based position, shown as a mono index. Omit to hide it. */
  index?: number;
}

/**
 * 1:1 release tile.
 *
 * Artwork-first, like the homepage bento: a real cover when one exists, otherwise the designed
 * Level-3 sleeve (title + AN mark + 4px signal rule).
 *
 * A generated sleeve already prints the title, the original artist and the year inside the image, so
 * the tile adds nothing but its index and, for real artwork only, a title + meta block underneath.
 * Printing the same three facts twice in one tile was the clearest example of the layering problem
 * the editorial pass removed (D-108).
 */
export function ReleaseCard({ release, index }: ReleaseCardProps) {
  const hasArtwork = Boolean(release.coverUrl);
  return (
    <Link href={release.href} className={`${styles.card} ${hasArtwork ? "" : styles.sleeve}`}>
      <span className={styles.top}>
        {index ? (
          <span className={styles.index}>{String(index).padStart(2, "0")}</span>
        ) : (
          <span className={styles.index} aria-hidden="true">
            ·
          </span>
        )}
        <span className={styles.arrow} aria-hidden="true">
          ↗
        </span>
      </span>

      <span className={styles.cover}>
        <ReleaseCover
          artwork={release.coverUrl ? { kind: "image", src: release.coverUrl } : coverArtwork(release.slug)}
          title={release.title}
          showTitle={false}
        />
      </span>

      {hasArtwork ? (
        <span className={styles.body}>
          <span className={styles.title}>{release.title}</span>
          <span className={styles.meta}>{release.meta}</span>
        </span>
      ) : null}
    </Link>
  );
}
