import Link from "next/link";

import styles from "./SectionHeader.module.css";

interface SectionHeaderProps {
  /** Mono label, e.g. "01 — Katalog". */
  eyebrow: string;
  title: string;
  id?: string;
  /** Optional trailing link, e.g. "Semua rilis" → /music. */
  action?: { href: string; label: string };
}

/**
 * Section head: mono index label, display title, hairline rule, optional "see all" link.
 * One shape for every section so the page reads as one publication (anti-generic rule, DESIGN.md).
 */
export function SectionHeader({ eyebrow, title, id, action }: SectionHeaderProps) {
  return (
    <div className={styles.head}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
      </div>
      {action ? (
        <Link href={action.href} className={styles.action}>
          {action.label} <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}
