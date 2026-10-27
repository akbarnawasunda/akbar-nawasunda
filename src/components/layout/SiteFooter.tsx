import Image from "next/image";
import Link from "next/link";

import { anMark } from "@/assets/web";
import { footerNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { contactEmail, contactHref, listenUrl, socialLinks } from "@/config/socials";
import { platformIcons, type PlatformKey } from "@/components/ui/PlatformIcon";
import { Equalizer } from "@/components/ui/Equalizer";
import { buildLabel } from "@/config/build";
import { releases, releaseDisplayTitle } from "@/content/releases";
import styles from "./SiteFooter.module.css";

/**
 * Footer — round 31, on the owner's spec: a quiet four-column grid and nothing louder.
 *
 * The 11.5vw wordmark across the bottom is gone; so is the bordered social strip and the full-width
 * booking bar. What remains is exactly the four things a footer owes a visitor — Navigasi, Sosial
 * (the in-house SVG marks), Rilis, Kontak — set at 12px with one hairline above and a single base
 * line below. Ornament that carries no function is an AI tell; a grid that answers four questions
 * is architecture.
 */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>
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
          <p className={styles.heading}>Sosial</p>
          <ul>
            {socialLinks.map((link) => {
              const Icon = platformIcons[link.platform as PlatformKey];
              return (
                <li key={link.platform}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    <Icon className={styles.socialIcon} />
                    <span>{link.label}</span>
                    <span className="sr-only"> (membuka tab baru)</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={styles.column}>
          <p className={styles.heading}>Rilis</p>
          <ul>
            {releases.slice(0, 5).map((release) => (
              <li key={release.slug}>
                <Link href={`/music/${release.slug}`}>{releaseDisplayTitle(release)}</Link>
              </li>
            ))}
            <li>
              <Link href="/music">Semua {releases.length} rilis</Link>
            </li>
          </ul>
        </div>

        <div className={styles.column}>
          <p className={styles.heading}>Kontak</p>
          <ul>
            <li>
              <a href={contactHref}>{contactEmail}</a>
            </li>
            <li>
              <Link href="/epk">Press kit</Link>
            </li>
            <li>
              <Link href="/contact">Halaman kontak</Link>
            </li>
            <li>
              <a className={styles.live} href={listenUrl} target="_blank" rel="noopener noreferrer">
                <Equalizer />
                <span>Sedang diputar</span>
                <span className="sr-only"> di Spotify (membuka tab baru)</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.base}>
        <p className={styles.mono}>
          <Image
            src={anMark.src}
            alt=""
            width={anMark.width}
            height={anMark.height}
            className={styles.mark}
            loading="lazy"
          />
          <span>
            {siteConfig.origin} · sejak {siteConfig.since}
          </span>
        </p>
        <p className={styles.mono} data-build={buildLabel}>
          {buildLabel}
        </p>
      </div>
    </footer>
  );
}
