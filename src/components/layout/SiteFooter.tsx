import Link from "next/link";

import { anMark } from "@/assets/web";
import { footerNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { contactEmail, contactHref, socialLinks } from "@/config/socials";
import { releases, releaseDisplayTitle } from "@/content/releases";
import styles from "./SiteFooter.module.css";

/**
 * Footer as a colophon: a giant monogram watermark, four columns of plain links, the roles as a mono
 * label, and one line of small print.
 *
 * Two things are deliberately *not* here:
 * - every streaming service: the ten of them live in the "Dengarkan di" row on the homepage and the
 *   artist page, and a footer that repeats all fourteen links is a link farm, not a colophon;
 * - a "Privacy" link — /privacy does not exist yet and its text belongs to the owner, so the column
 *   says so out loud instead of shipping a dead link.
 *
 * The release column shows the six newest entries plus a link to the catalogue: with ten releases it
 * would otherwise be twice as tall as every other column.
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
          <p className={styles.stamp}>
            Produser
            <br />
            Remixer · DJ
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
            {releases.slice(0, 6).map((release) => (
              <li key={release.slug}>
                <Link href={`/music/${release.slug}`}>{releaseDisplayTitle(release)}</Link>
                <span className={styles.year}>{release.year ?? "[NEEDS OWNER]"}</span>
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
            <li>
              <a href={contactHref}>
                Email
                <span className={styles.external} aria-hidden="true">
                  ↗
                </span>
              </a>
            </li>
          </ul>
          <p className={styles.address}>{contactEmail}</p>
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

      {/* The one contact action the page actually wants, set as a solid bar. */}
      <div className={styles.contactBar}>
        <a className={styles.contactLink} href={contactHref}>
          <span className={styles.contactLabel}>Bookings · Remix · Kolaborasi</span>
          <span className={styles.contactValue}>{contactEmail}</span>
        </a>
      </div>

      <div className={styles.meta}>
        <p className={styles.mono}>
          © {new Date().getFullYear()} {siteConfig.name} • {siteConfig.origin} • Sejak {siteConfig.since}
        </p>
        <p className={styles.mono}>akbarnawasunda.my.id</p>
      </div>

      <p className={styles.smallprint}>
        Breakbeat, Indo Bass, dan Jedag Jedug dari Bandung Barat. Sampul rilis dibuat dari judul dan
        monogram; setiap tautan dengar mengarah ke kanal resmi.
      </p>

      <div className={styles.strip} aria-hidden="true" />
    </footer>
  );
}
