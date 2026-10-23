import Link from "next/link";

import type { ReleaseView } from "@/content/release-view";
import styles from "./ReleaseCard.module.css";

interface ReleaseCardProps {
  release: ReleaseView;
  /** 1-based position, shown as a mono index. Omit to hide it. */
  index?: number;
}

/**
 * 1:1 release tile.
 *
 * With artwork it shows the cover; without, it becomes a typographic panel (large title, mono meta)
 * rather than a grey placeholder. The blue signal edge on the bottom and the arrow are the only
 * hover affordances — no tilt, no glow.
 */
export function ReleaseCard({ release, index }: ReleaseCardProps) {
  return (
    <Link href={release.href} className={styles.card}>
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

      {release.coverUrl ? (
        <span className={styles.cover}>
          {/* eslint-disable-next-line @next/next/no-img-element -- owner-uploaded 1:1 file, served as-is */}
          <img src={release.coverUrl} alt="" width={600} height={600} loading="lazy" decoding="async" />
        </span>
      ) : null}

      <span className={styles.body}>
        <span className={styles.title}>{release.title}</span>
        <span className={styles.meta}>{release.meta}</span>
      </span>
    </Link>
  );
}
