import Link from "next/link";

import { siteConfig } from "@/config/site";
import styles from "./page.module.css";

/**
 * Placeholder home page. Intentionally minimal: the production site is not built yet.
 */
export default function HomePage() {
  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <p className={styles.label}>{siteConfig.role}</p>
        <h1 className={styles.title}>{siteConfig.name}</h1>
        <p className={styles.note}>
          <Link href="/experiments/lattice">Visual study 01 — Lattice →</Link>
        </p>
      </div>
    </main>
  );
}
