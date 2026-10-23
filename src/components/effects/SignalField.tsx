import styles from "./SignalField.module.css";

interface SignalFieldProps {
  className?: string;
}

/**
 * Liquid Signal placeholder.
 *
 * Phase 7 replaces the visual with the single WebGL scene, but the contract stays: one 600x600
 * layer, z-index -1, breathing scale 1 → 1.03 over 6s, aria-hidden, and fully disabled under
 * prefers-reduced-motion (3D_ART_DIRECTION.md). It is pure CSS, so it costs no JavaScript.
 */
export function SignalField({ className }: SignalFieldProps) {
  const classes = className ? `${styles.signal} ${className}` : styles.signal;
  return <div className={classes} aria-hidden="true" data-signal-field="placeholder" />;
}
