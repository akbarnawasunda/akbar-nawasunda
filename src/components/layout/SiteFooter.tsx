import Link from "next/link";

import { primaryNav } from "@/config/navigation";
import type { ArtistIdentity } from "@/studio/artist-settings";
import styles from "./SiteFooter.module.css";

/**
 * Site footer: identity, published social links (only when the owner has published some), and
 * navigation. Links were checked as https when they were saved, so they are rendered as given.
 */
export function SiteFooter({ identity }: { identity: ArtistIdentity }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.identity}>
          <p className={styles.name}>{identity.name}</p>
          <p className={styles.muted}>{identity.role}</p>
          {identity.socialLinks.length > 0 ? (
            <nav aria-label="Social" className={styles.social}>
              <ul>
                {identity.socialLinks.map((link, index) => (
                  <li key={`${index}-${link.href}`}>
                    <a href={link.href} rel="noopener noreferrer" target="_blank">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
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
