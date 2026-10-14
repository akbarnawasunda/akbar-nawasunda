import { LatticeCanvas } from "@/experiments/lattice/LatticeCanvas";

import styles from "./SpatialBackdrop.module.css";

/**
 * Shared visual layer: the animated spatial field plus a vignette.
 * Renders as absolutely positioned decoration; the parent must be `position: relative`.
 */
export function SpatialBackdrop() {
  return (
    <>
      <div className={styles.field}>
        <LatticeCanvas />
      </div>
      <div className={styles.vignette} aria-hidden="true" />
    </>
  );
}
