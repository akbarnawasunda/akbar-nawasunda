import Link from "next/link";

import { primaryNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import styles from "./SiteFooter.module.css";

/** Site footer. Contains only verified identity and navigation; no social or contact links yet. */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.identity}>
          <p className={styles.name}>{siteConfig.name}</p>
          <p className={styles.muted}>{siteConfig.role}</p>
        </div>

        <nav aria-label="Footer" className={styles.nav}>
          <ul>
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className={styles.muted}>© {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
