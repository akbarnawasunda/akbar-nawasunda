import styles from "./HudMarks.module.css";

/**
 * The two decorative marks of this design system, and nothing else.
 *
 * The reference site draws its interface out of `+` and `×` glyphs: a rule of alternating marks
 * where a section ends, a cross in each corner of a framed band. It is a cheap trick that works
 * because it is *typographic* — the marks sit on the same baseline grid as the mono labels, so they
 * read as instrumentation rather than as clip art.
 *
 * Drawn as text, not as SVG or as pseudo-element lines, for three reasons: `+` and `×` already exist
 * in every font at the exact weight of the label beside them; there is no extra HTTP request and no
 * extra DOM per mark; and a screen reader never sees them (`aria-hidden`) while a search engine and
 * a text-only mode simply ignore them.
 *
 * `variant`:
 * - `row`     — a hairline strip of alternating marks, used as a section seam;
 * - `corners` — four marks pinned to the corners of a `position: relative` parent.
 */
export function HudMarks({
  variant = "row",
  count = 14,
  className,
}: {
  variant?: "row" | "corners";
  count?: number;
  className?: string;
}) {
  if (variant === "corners") {
    return (
      <span className={className ? `${styles.corners} ${className}` : styles.corners} aria-hidden="true">
        <span className={styles.corner}>+</span>
        <span className={styles.corner}>×</span>
        <span className={styles.corner}>×</span>
        <span className={styles.corner}>+</span>
      </span>
    );
  }

  return (
    <p className={className ? `${styles.row} ${className}` : styles.row} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={index % 2 === 0 ? styles.plus : styles.cross}>
          {index % 2 === 0 ? "+" : "×"}
        </span>
      ))}
    </p>
  );
}
