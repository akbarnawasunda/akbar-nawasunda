import Image from "next/image";
import Link from "next/link";

import { anMark } from "@/assets/web";
import { footerNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { contactEmail, contactHref, socialLinks } from "@/config/socials";
import { platformIcons, type PlatformKey } from "@/components/ui/PlatformIcon";
import { buildLabel } from "@/config/build";
import { releases, releaseDisplayTitle } from "@/content/releases";
import styles from "./SiteFooter.module.css";

/**
 * Footer — the HUD's bottom edge.
 *
 * Four things, in this order, because that is the order a visitor needs them:
 *
 *   1. **Follow** — the profiles as a row of bordered cells. On the reference this is the loudest
 *      thing in the footer, and it is right: a fan at the bottom of an artist's page wants the
 *      channels, not the sitemap.
 *   2. **The columns** — navigation, the newest releases, and the one legal line that exists.
 *   3. **The contact bar** — the email, set large, because it is the only address that books work.
 *   4. **The wordmark** — the name at 11.5vw across the bottom, which is the one place on the site
 *      where the type is allowed to be decoration.
 *
 * Removed in this round: the `[NEEDS OWNER]` markers (a missing year is now an em dash and the
 * privacy row is simply absent — the page does not exist, and printing a promise of one on every
 * page of the site was the opposite of premium), and the four-line small print that explained the
 * catalogue to the reader.
 */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.follow}>
          <p className={styles.followLabel}>Ikuti</p>
          <ul className={styles.socialRow}>
            {socialLinks.map((link) => {
              const Icon = platformIcons[link.platform as PlatformKey];
              return (
                <li key={link.platform}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    {/*
                      Round 26, owner: socials read as empty text cells. Each profile now carries
                      its monochrome SVG mark above the word — the same in-house 24px grid the
                      listening row uses, so the footer stays one system.
                    */}
                    <Icon className={styles.socialIcon} />
                    {link.label}
                    <span className="sr-only"> (membuka tab baru)</span>
                  </a>
                </li>
              );
            })}
            <li>
              <a href={contactHref}>
                Email
                <span className="sr-only"> (menulis surel)</span>
              </a>
            </li>
          </ul>
        </div>

        <div className={styles.columns}>
          <div className={styles.brand}>
            <Image
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
              {siteConfig.origin} · sejak {siteConfig.since}
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
            <p className={styles.heading}>Rilis</p>
            <ul>
              {releases.slice(0, 6).map((release) => (
                <li key={release.slug}>
                  <Link href={`/music/${release.slug}`}>{releaseDisplayTitle(release)}</Link>
                  <span className={styles.year}>{release.year ?? "—"}</span>
                </li>
              ))}
              <li>
                <Link href="/music">
                  Semua {releases.length} rilis<span aria-hidden="true"> →</span>
                </Link>
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
            </ul>
          </div>
        </div>
      </div>

      {/* The one action the footer actually wants, set as a full-width bar. */}
      <a className={styles.contactBar} href={contactHref}>
        <span className={styles.contactLabel}>Booking · Remix · Lisensi</span>
        <span className={styles.contactValue}>
          {contactEmail}
          <span aria-hidden="true"> ↗</span>
        </span>
      </a>

      {/* The name as an object. Decorative repetition of the h1, so it is hidden from AT. */}
      <p className={styles.wordmark} aria-hidden="true">
        Akbar Nawasunda
      </p>

      <div className={styles.inner}>
        <div className={styles.meta}>
          <p className={styles.mono}>
            © {new Date().getFullYear()} {siteConfig.name} · {siteConfig.origin}
          </p>
          <p className={`${styles.mono} ${styles.build}`} data-build={buildLabel}>
            {buildLabel}
          </p>
          <p className={styles.mono}>akbarnawasunda.my.id</p>
        </div>
      </div>
    </footer>
  );
}
