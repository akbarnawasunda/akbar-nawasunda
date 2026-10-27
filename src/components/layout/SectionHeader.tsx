import Link from "next/link";

import styles from "./SectionHeader.module.css";

interface SectionHeaderProps {
  /* Mono label, one word, never a number: the "01 — Katalog" ornament was retired in round 31
     because numbered sections are the loudest tell of a machine assembling a page. */
  eyebrow: string;
  title: string;
  id?: string;
  /** Optional trailing link, e.g. "Semua rilis" → /music. */
  action?: { href: string; label: string };
  /**
   * Heading level. Sections on a page use h2; a page whose only heading is this component passes
   * "h1" so the document still has exactly one top-level heading (/visuals).
   */
  as?: "h1" | "h2";
  /**
   * Which side the title hangs from. Alternating it down a long page is how an editorial spread stops
   * being a stack of identical left-aligned blocks (D-111).
   */
  align?: "start" | "end";
}

/**
 * Section head: mono index label, display title, hairline rule, optional "see all" link.
 * One shape for every section so the page reads as one publication (anti-generic rule, DESIGN.md).
 */
export function SectionHeader({
  eyebrow,
  title,
  id,
  action,
  as: Heading = "h2",
  align = "start",
}: SectionHeaderProps) {
  return (
    <div className={align === "end" ? `${styles.head} ${styles.end}` : styles.head}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <Heading id={id} className={`${styles.title} ink`}>
          {title}
        </Heading>
      </div>
      {action ? (
        <Link href={action.href} className={styles.action}>
          {action.label} <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}
