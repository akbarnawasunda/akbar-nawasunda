import styles from "./Registration.module.css";

/**
 * A printer's registration mark, and the name of the print run.
 *
 * This is the smallest possible statement of the concept: the marks by which a press operator would
 * check that two plates are lined up. It is printed in the corner of every printed surface on the
 * site — page heads, the hero, the verso — which is how a visitor knows that the misregistered type
 * further down is a decision and not a bug.
 *
 * Decorative, so it is `aria-hidden`: a screen reader has no use for a crop mark, and the print run
 * label is repeated in words in the colophon.
 */
export function Registration({
  tone = "paper",
  code = "R9 · cetak ganda",
}: {
  /** `paper` prints the mark in ink for a light ground; `ink` prints it in the light ink for a dark one. */
  tone?: "paper" | "ink" | "onBrand";
  code?: string;
}) {
  return (
    <div className={`${styles.marks} ${styles[tone]}`} aria-hidden="true">
      <span className={styles.cross} />
      <span className={styles.rule} />
      <span className={styles.code}>{code}</span>
    </div>
  );
}
