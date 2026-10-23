import { anMark } from "@/assets/web";
import type { CoverArtwork } from "@/content/covers";
import styles from "./ReleaseCover.module.css";

interface ReleaseCoverProps {
  artwork: CoverArtwork;
  title: string;
  /** The featured card is 16:9; every other card is 1:1. */
  shape?: "square" | "wide";
  /** True for the one image above the fold; everything else stays lazy. */
  priority?: boolean;
  /**
   * Whether the designed sleeve prints the title. Off when the card already shows the title in its
   * own body, so the same words never appear twice in one tile.
   */
  showTitle?: boolean;
}

/**
 * One release sleeve, in either of the two shapes the site actually has.
 *
 * When a real file exists it is used as-is. When it does not, the sleeve is built from the three
 * things that are definitely true — the title, the AN mark and the brand palette — at 24px on
 * #101014 with a 4px #0087FF → #7800FF rule along the bottom edge. That is the brief's Level 3
 * artwork: a designed sleeve, not an empty card and not someone else's photograph.
 */
export function ReleaseCover({
  artwork,
  title,
  shape = "square",
  priority = false,
  showTitle = true,
}: ReleaseCoverProps) {
  if (artwork.kind === "image") {
    return (
      <span className={`${styles.cover} ${shape === "wide" ? styles.wide : styles.square}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- owner-uploaded file, exact bytes */}
        <img
          src={artwork.src}
          alt={`Artwork ${title}`}
          width={shape === "wide" ? 1200 : 600}
          height={shape === "wide" ? 675 : 600}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      </span>
    );
  }

  return (
    <span
      className={`${styles.cover} ${styles.generated} ${shape === "wide" ? styles.wide : styles.square}`}
      data-cover="generated"
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 13 KB brand mark used as texture */}
      <img className={styles.ghost} src={anMark.src} alt="" width={anMark.width} height={anMark.height} />
      {showTitle ? <span className={styles.title}>{title}</span> : null}
    </span>
  );
}
