import Image from "next/image";
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
 * A real file (owner upload or Spotify download) is used as-is. A generated sleeve file
 * (`<slug>@sleeve.webp`) is also served as an image — it was rendered offline by
 * scripts/generate-placeholder-covers.mjs, which is why it can print the title without a layout
 * shift. Only when no file exists at all does the sleeve get drawn in the browser, from the three
 * things that are definitely true: the title, the AN mark and the brand palette, on #101014 with a
 * 4px #0087FF → #7800FF rule along the bottom edge.
 */
export function ReleaseCover({
  artwork,
  title,
  shape = "square",
  priority = false,
  showTitle = true,
}: ReleaseCoverProps) {
  if (artwork.kind !== "generated") {
    return (
      <span className={`${styles.cover} ${shape === "wide" ? styles.wide : styles.square}`}>
        <Image
          src={artwork.src}
          /* A sleeve carries no type at all (round 19), so every alt names the release. */
          alt={`Artwork ${title}`}
          width={shape === "wide" ? 1200 : 600}
          height={shape === "wide" ? 675 : 600}
          sizes="(min-width: 1024px) 30vw, 80vw"
          priority={priority}
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
      <Image
        className={styles.ghost}
        src={anMark.src}
        alt=""
        width={anMark.width}
        height={anMark.height}
        sizes="(min-width: 1024px) 12vw, 30vw"
      />
      {showTitle ? <span className={styles.title}>{title}</span> : null}
    </span>
  );
}
