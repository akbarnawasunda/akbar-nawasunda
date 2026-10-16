import Image, { type StaticImageData } from "next/image";

import styles from "./content.module.css";

interface ReleaseSleeveProps {
  /** Release type label, e.g. "Single". Shown on the typographic sleeve when there is no artwork. */
  typeLabel: string;
  /** Approved release artwork, or null. The site never invents artwork. */
  artwork: { image: StaticImageData; alt: string } | null;
  /** Responsive image sizes hint for next/image. */
  sizes: string;
  /** Decorative sleeves sit beside the title text, so the image is hidden from assistive technology. */
  decorative?: boolean;
}

/**
 * Square sleeve for a release. With approved artwork it shows the image. Without it, it shows a
 * neutral typographic sleeve built only from the release type, so no picture is ever made up.
 */
export function ReleaseSleeve({ typeLabel, artwork, sizes, decorative = false }: ReleaseSleeveProps) {
  if (artwork) {
    return (
      <div className={styles.sleeve}>
        <Image
          src={artwork.image}
          alt={decorative ? "" : artwork.alt}
          fill
          sizes={sizes}
          unoptimized
          className={styles.sleeveImage}
        />
      </div>
    );
  }
  return (
    <div className={styles.sleeve} aria-hidden="true">
      <div className={styles.sleeveBlank}>
        <span className={styles.sleeveRule} />
        <span className={styles.sleeveType}>{typeLabel}</span>
      </div>
    </div>
  );
}
