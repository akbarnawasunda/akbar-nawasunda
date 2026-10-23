import Link from "next/link";

import { anMark } from "@/assets/web";
import { footerNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { socialLinks } from "@/config/socials";
import { releases, releaseDisplayTitle } from "@/content/releases";
import styles from "./SiteFooter.module.css";

/**
 * Footer as the back page of the zine: a giant monogram watermark, four columns, a rubber stamp and
 * one line of small print.
 *
 * Two things are deliberately *not* here:
 * - Instagram, Apple Music, YouTube Music and any booking address — their URLs are unverified, and a
 *   guessed link is worse than a missing one (SOCIAL_LINKS.md);
 * - a "Privacy" link — /privacy does not exist yet and its text belongs to the owner, so the column
 *   says so out loud instead of shipping a dead link.
 */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 13 KB static mark used as texture */}
      <img className={styles.ghost} src={anMark.src} alt="" width={anMark.width} height={anMark.height} loading="lazy" />

      <div className={styles.inner}>
        <div className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
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
          <p className={`stamp ${styles.stamp}`}>
            Human made
            <br />
            no AI artwork
          </p>
        </div>

        <nav aria-label="Navigasi footer" className={styles.column}>
          <p className={styles.heading}>Navigasi</p>
          <ul>
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.column}>
          <p className={styles.heading}>Rilisan</p>
          <ul>
            {releases.map((release) => (
              <li key={release.slug}>
                <Link href={`/music/${release.slug}`}>{releaseDisplayTitle(release)}</Link>
                <span className={styles.year}>{release.year ?? "[NEEDS OWNER]"}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.column}>
          <p className={styles.heading}>Sosmed</p>
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

        <div className={styles.column}>
          <p className={styles.heading}>Legal</p>
          <ul>
            <li>
              <Link href="/epk">Press kit</Link>
            </li>
            <li>
              <Link href="/contact">Kontak</Link>
            </li>
            <li>
              <span className={styles.pending}>
                Kebijakan privasi <span className={styles.needs}>[NEEDS OWNER]</span>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.meta}>
        <p className={styles.mono}>
          © {new Date().getFullYear()} {siteConfig.name} • {siteConfig.origin} • Sejak {siteConfig.since}
        </p>
        <p className={styles.mono}>akbarnawasunda.my.id</p>
      </div>

      <p className={styles.smallprint}>
        Dibuat di Bandung Barat. Foto, monogram, dan sampul rilis adalah berkas asli pemilik — tidak
        ada gambar hasil generate di situs ini.
      </p>

      <div className={styles.strip} aria-hidden="true" />
    </footer>
  );
}
