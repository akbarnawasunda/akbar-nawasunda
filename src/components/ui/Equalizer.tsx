import styles from "./Equalizer.module.css";

/**
 * The live indicator — round 31, owner's ask: four hairline bars breathing like a meter on a deck
 * that is quietly playing. Pure CSS, transform-only (`scaleY`), desynchronised with negative delays
 * so no two bars share a phase; under `prefers-reduced-motion` they stand still at rest heights.
 * Decorative, so the whole thing is hidden from assistive tech and the meaning lives in the label
 * beside it.
 */
export function Equalizer() {
  return (
    <span className={styles.eq} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
