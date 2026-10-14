import Link from "next/link";

import { SpatialBackdrop } from "@/effects/SpatialBackdrop";
import { roles, siteConfig } from "@/config/site";
import styles from "./page.module.css";

/**
 * Homepage. Composition: spatial backdrop beneath, the name as the dominant typographic
 * element, and the three roles as an indexed list. No biography, releases or imagery.
 */
export default function HomePage() {
  return (
    <main className={styles.hero}>
      <SpatialBackdrop />

      <header className={styles.chrome}>
        <span>{siteConfig.name}</span>
        <Link href="/experiments/lattice">Study 01 →</Link>
      </header>

      <div className={styles.content}>
        <ol className={styles.roles} aria-label="Roles">
          {roles.map((role, index) => (
            <li key={role} className={styles.role}>
              <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
              <span>{role}</span>
            </li>
          ))}
        </ol>
        <h1 className={styles.title}>
          <span>Akbar</span>
          <span>Nawasunda</span>
        </h1>
      </div>

      <footer className={styles.footer}>
        <span>{siteConfig.role}</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </main>
  );
}
