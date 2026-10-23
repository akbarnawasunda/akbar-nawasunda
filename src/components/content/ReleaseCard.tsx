import Link from "next/link";

import { anMark } from "@/assets/web";
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
 * With artwork it shows the cover; without, the AN mark sits in the middle at 9% as texture, the way
 * the bento tiles do, so the catalog never reads as empty grey panels. The blue signal edge on the bottom and the arrow are the only
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
      ) : (
        <span className={styles.ghost} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- 13 KB brand mark used as texture */}
          <img src={anMark.src} alt="" width={anMark.width} height={anMark.height} loading="lazy" decoding="async" />
        </span>
      )}

      <span className={styles.body}>
        <span className={styles.title}>{release.title}</span>
        <span className={styles.meta}>{release.meta}</span>
      </span>
    </Link>
  );
}
