import Link from "next/link";

import { lockup } from "@/assets/web";
import { primaryNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { socialLinks } from "@/config/socials";
import styles from "./SiteFooter.module.css";

/**
 * Site footer: the full lockup (footer/EPK use only, never the nav), navigation, the four verified
 * platforms and the identity line, closing with the 5px signal strip.
 *
 * Instagram and Apple Music are deliberately absent: their URLs are not verified yet
 * (docs/01-BRAND-IDENTITY/SOCIAL_LINKS.md). A broken or guessed link is worse than a missing one.
 */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.identity}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 33 KB static lockup */}
          <img
            src={lockup.src}
            alt=""
            width={lockup.width}
            height={lockup.height}
            className={styles.lockup}
            loading="lazy"
            decoding="async"
          />
          <p className={styles.role}>{siteConfig.role}</p>
        </div>

        <nav aria-label="Footer" className={styles.column}>
          <p className={styles.heading}>Jelajahi</p>
          <ul>
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.column}>
          <p className={styles.heading}>Dengar &amp; ikuti</p>
          <ul>
            {socialLinks.map((link) => (
              <li key={link.platform}>
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                  <span className={styles.external} aria-hidden="true">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.meta}>
        <p>© {new Date().getFullYear()} {siteConfig.name}</p>
        <p>
          {siteConfig.origin} · Sejak {siteConfig.since}
        </p>
        <p className={styles.domain}>akbarnawasunda.my.id</p>
      </div>

      <div className={styles.strip} aria-hidden="true" />
    </footer>
  );
}
