import Link from "next/link";

import { siteConfig } from "@/config/site";
import { LatticeCanvas } from "./LatticeCanvas";
import styles from "./LatticeExperiment.module.css";

/**
 * Full-viewport composition for the Lattice study.
 * Layers: effects (canvas + vignette) < content (name) < chrome (navigation labels).
 */
export function LatticeExperiment() {
  return (
    <section className={styles.study} aria-labelledby="study-title">
      <div className={styles.effects}>
        <LatticeCanvas />
      </div>
      <div className={styles.vignette} aria-hidden="true" />

      <header className={styles.chrome}>
        <Link href="/">{siteConfig.name}</Link>
        <span>Study 01 — Lattice</span>
      </header>

      <div className={styles.content}>
        <p className={styles.label}>{siteConfig.role}</p>
        <h1 id="study-title" className={styles.title}>
          <span>Akbar</span>
          <span>Nawasunda</span>
        </h1>
      </div>
    </section>
  );
}
