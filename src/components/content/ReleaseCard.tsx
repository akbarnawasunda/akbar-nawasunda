import Link from "next/link";
import type { StaticImageData } from "next/image";

import { ReleaseSleeve } from "./ReleaseSleeve";
import styles from "./content.module.css";

interface ReleaseCardProps {
  href: string;
  typeLabel: string;
  /** Public date, or null when it is not verified. */
  date: string | null;
  title: string;
  artwork: { image: StaticImageData; alt: string } | null;
}

/**
 * One release in the archive. The whole card is a single link with a clear "View release" label,
 * so the row is easy to recognise and easy to tap on a phone.
 */
export function ReleaseCard({ href, typeLabel, date, title, artwork }: ReleaseCardProps) {
  return (
    <Link href={href} className={styles.card}>
      <span className={styles.cardSleeve}>
        <ReleaseSleeve typeLabel={typeLabel} artwork={artwork} sizes="(min-width: 900px) 33vw, 104px" decorative />
      </span>
      <span className={styles.cardBody}>
        <span className={styles.cardMeta}>
          {typeLabel}
          {date ? ` · ${date}` : ""}
        </span>
        <span className={styles.cardTitle}>{title}</span>
        <span className={styles.cardOpen}>
          View release <span aria-hidden="true">→</span>
        </span>
      </span>
    </Link>
  );
}
