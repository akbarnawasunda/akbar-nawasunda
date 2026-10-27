"use client";

import { useState } from "react";
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
  /**
   * Alt text for the real file. Defaults to "Artwork <title>", which is what a sleeve should say
   * when it stands on its own.
   *
   * Round 35.1: pass `""` when the sleeve is the *only* content of a link that carries its own
   * `aria-label`. WCAG 2.5.3 ("label in name") compares the link's visible text with its accessible
   * name, and an image's alt text counts as visible text — so a link named "Buka rilis Cinta
   * Terbuang" wrapping an image alt-ed "Artwork Cinta Terbuang" fails the rule even though both
   * strings name the same record. One name, one place: the link owns it, the picture is decorative.
   */
  alt?: string;
}

/**
 * One release sleeve, in either of the two shapes the site actually has.
 *
 * A real file (owner upload or Spotify download) is used as-is. A generated sleeve file
 * (`<slug>@sleeve.webp`) is also served as an image — it was rendered offline by
 * scripts/generate-placeholder-covers.mjs, which is why it can print the title without a layout
 * shift. Only when no file exists at all does the sleeve get drawn in the browser, from the three
 * things that are definitely true: the title, the AN mark and the brand palette.
 *
 * Round 33: the waterfall has a floor. A file whose URL 404s (a cover named in the catalogue but
 * never copied into `public/`) used to render the browser's empty white box — the one thing no
 * sleeve should be. `onError` now swaps in the fallback panel: `--color-cover-fallback` (#14263A)
 * with the mark on it, square to the blade, always dark so it still reads as a sleeve on a dark
 * page. That is why this is a client component: an error can only be seen at runtime.
 */
export function ReleaseCover({
  artwork,
  title,
  shape = "square",
  priority = false,
  showTitle = true,
  alt,
}: ReleaseCoverProps) {
  const [failed, setFailed] = useState(false);
  const shapeClass = shape === "wide" ? styles.wide : styles.square;

  if (artwork.kind !== "generated" && !failed) {
    return (
      <span className={`${styles.cover} ${shapeClass}`}>
        <Image
          src={artwork.src}
          /* A sleeve carries no type at all (round 19), so every alt names the release. */
          alt={alt ?? `Artwork ${title}`}
          width={shape === "wide" ? 1200 : 600}
          height={shape === "wide" ? 675 : 600}
          sizes="(min-width: 1024px) 30vw, 80vw"
          priority={priority}
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  if (artwork.kind !== "generated" && failed) {
    /* The fallback is a picture too, so it follows the same rule as the real file: named when it
       stands alone, hidden from the accessibility tree when the link around it already speaks. */
    const decorative = alt === "";
    return (
      <span
        className={`${styles.cover} ${styles.fallback} ${shapeClass}`}
        data-cover="fallback"
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : `Artwork ${title}`}
        aria-hidden={decorative ? true : undefined}
      >
        <Image
          className={styles.fallbackMark}
          src={anMark.src}
          alt=""
          width={anMark.width}
          height={anMark.height}
          sizes="(min-width: 1024px) 14vw, 40vw"
        />
        {/* Round 35: the fallback names the record. A missing file is a missing picture, not a
            missing release — the sleeve still has to say which song it belongs to. */}
        <span className={styles.fallbackTitle}>{title}</span>
      </span>
    );
  }

  return (
    <span
      className={`${styles.cover} ${styles.generated} ${shapeClass}`}
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
