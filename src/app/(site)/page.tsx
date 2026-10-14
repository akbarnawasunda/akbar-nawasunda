import Link from "next/link";

import { SpatialBackdrop } from "@/effects/SpatialBackdrop";
import { roles, siteConfig } from "@/config/site";
import styles from "./page.module.css";

/**
 * Homepage. The spatial backdrop sits beneath; the name is the dominant typographic element
 * and the three roles are an indexed list. No biography, releases or imagery.
 */
export default function HomePage() {
  return (
    <section className={styles.hero} aria-label={siteConfig.name}>
      <SpatialBackdrop />

      <Link href="/experiments/lattice" className={styles.study}>
        Visual study 01 →
      </Link>

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
    </section>
  );
}
