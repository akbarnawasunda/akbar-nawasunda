import styles from "./GrainOverlay.module.css";

/**
 * Film grain over the whole page (reference set: 2% noise on every reference screenshot).
 *
 * It is a single fixed layer of SVG `feTurbulence` fractal noise rendered once by the compositor,
 * not an image file and not a blur filter: no extra request, no per-frame cost. The layer is
 * `pointer-events: none`, `aria-hidden`, and sits just under the overlay layer so the gallery
 * lightbox and the skip link stay above it.
 *
 * The noise is generated at 0.9 baseFrequency so the grain is roughly one CSS pixel at 1x and
 * disappears at 2x — which is the point: it should read as texture, never as pattern.
 */
export function GrainOverlay() {
  return <div className={styles.grain} aria-hidden="true" />;
}
