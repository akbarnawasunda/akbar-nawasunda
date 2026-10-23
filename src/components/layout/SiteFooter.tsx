import Link from "next/link";

import { anMark } from "@/assets/web";
import { footerNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { socialLinks } from "@/config/socials";
import styles from "./SiteFooter.module.css";

/**
 * Footer: identity, navigation, verified platforms, then the 5px signal strip.
 *
 * Instagram, Apple Music, YouTube Music and any booking address are absent on purpose: their URLs
 * are not verified (SOCIAL_LINKS.md), and a guessed link is worse than a missing one.
 */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.identity}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 13 KB static mark */}
          <img
            src={anMark.src}
            alt=""
            width={anMark.width}
            height={anMark.height}
            className={styles.mark}
            loading="lazy"
            decoding="async"
          />
          <p className={styles.name}>{siteConfig.name}</p>
          <p className={styles.mono}>
            {siteConfig.origin} • Sejak {siteConfig.since}
          </p>
        </div>

        <nav aria-label="Navigasi footer" className={styles.column}>
          <p className={styles.heading}>Jelajahi</p>
          <ul>
            {footerNav.map((item) => (
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
                  <span className="sr-only"> (membuka tab baru)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.meta}>
        <p className={styles.mono}>© {new Date().getFullYear()} {siteConfig.name}</p>
        <p className={styles.mono}>akbarnawasunda.my.id</p>
      </div>

      <div className={styles.strip} aria-hidden="true" />
    </footer>
  );
}
