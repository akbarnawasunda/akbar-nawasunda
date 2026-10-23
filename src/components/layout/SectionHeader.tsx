import Link from "next/link";

import styles from "./SectionHeader.module.css";

interface SectionHeaderProps {
  /** Mono label, e.g. "01 — Katalog". */
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
}

/**
 * Section head: mono index label, display title, hairline rule, optional "see all" link.
 * One shape for every section so the page reads as one publication (anti-generic rule, DESIGN.md).
 */
export function SectionHeader({ eyebrow, title, id, action, as: Heading = "h2" }: SectionHeaderProps) {
  return (
    <div className={styles.head}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <Heading id={id} className={styles.title}>
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
