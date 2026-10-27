import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { anMark, portraitAlt, portraitSources } from "@/assets/web";
import { Container } from "@/components/layout/Container";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { artistFacts, artistLine, artistLongBio } from "@/content/artist";
import { siteConfig } from "@/config/site";
import { contactEmail, contactHref, listenLinks, listenUrl, socialLinks } from "@/config/socials";
import { pageMetadata } from "@/lib/metadata";
import styles from "./epk.module.css";

export const metadata: Metadata = pageMetadata({
  title: "EPK",
  description:
    "Electronic press kit Akbar Nawasunda: potret resmi, logo transparan, fakta terverifikasi, dan tautan platform. Satu paket unduhan.",
  path: "/epk",
});

const PACK_FILES = [
  { name: "press-photo-print.jpg", note: "Potret resmi 1200 px, untuk cetak", size: "394 KB" },
  { name: "press-photo-web.webp", note: "Potret resmi 960 px, untuk web", size: "143 KB" },
  { name: "an-mark-transparent.png", note: "Monogram AN, latar transparan", size: "231 KB" },
  { name: "lockup-transparent.png", note: "Lockup AN + wordmark, transparan", size: "202 KB" },
  { name: "README.md", note: "Fakta terverifikasi dan ketentuan pemakaian", size: "1 KB" },
];

const PACK_URL = "/epk/akbar-nawasunda-epk.zip";
const PACK_SIZE = "1,0 MB";

/**
 * /epk — press kit page.
 *
 * The zip is a real, versioned file built by scripts/build-epk.sh from the owner's originals, so a
 * journalist gets one download instead of right-clicking images. Nothing in it claims anything the
 * owner has not supplied: the bio is their own text (D-090), the contact is their published address,
 * and the services list is theirs.
 */
export default function EpkPage() {
  return (
    <Container>
      <header className={styles.head}>
        <div className={styles.headCopy}>
          <p className={styles.eyebrow}>Press kit</p>
          <h1 className={`${styles.title} ink`}>Press kit</h1>
          <p className={styles.lead}>
            Potret resmi, logo transparan, fakta terverifikasi, dan tautan platform. Satu unduhan.
          </p>
        </div>

        <div className={styles.actions}>
          <ButtonLink href={PACK_URL} variant="primary" external>
            Unduh press kit (.zip, {PACK_SIZE})
          </ButtonLink>
          <ButtonLink href={listenUrl} variant="secondary" external>
            Spotify
          </ButtonLink>
        </div>
      </header>

      <div className={styles.body}>
        <section className={styles.pack} aria-labelledby="pack-title">
          <h2 id="pack-title" className={styles.sectionTitle}>
            Isi paket
          </h2>
          <ul className={styles.fileList}>
            {PACK_FILES.map((file) => (
              <li key={file.name}>
                <code>{file.name}</code>
                <span className={styles.fileNote}>{file.note}</span>
                <span className={styles.fileSize}>{file.size}</span>
              </li>
            ))}
          </ul>
          <p className={styles.terms}>
            Foto dan logo boleh dipakai untuk pemberitaan dan promosi yang menyebut Akbar Nawasunda.
          </p>
        </section>

        <aside className={styles.preview} aria-label="Potret resmi">
          <Image
            src={portraitSources[0].webp}
            alt={portraitAlt}
            width={portraitSources[0].width}
            height={portraitSources[0].height}
            sizes="(min-width: 1024px) 320px, 92vw"
            loading="lazy"
          />
          <p className={styles.previewCaption}>Potret resmi · press-photo-print.jpg</p>
        </aside>
      </div>

      <section className={styles.sheet} aria-labelledby="sheet-title">
        <div>
          <h2 id="sheet-title" className={styles.sectionTitle}>
            Fakta terverifikasi
          </h2>

          <p className={styles.bio}>{artistLongBio}</p>
        </div>

        <dl className={styles.facts}>
          {artistFacts.map((fact) => (
            <div key={fact.label} className={styles.fact}>
              <dt>{fact.label}</dt>
              <dd>{fact.value ?? "—"}</dd>
            </div>
          ))}
          <div className={styles.fact}>
            <dt>Situs</dt>
            <dd>{siteConfig.url.replace(/^https?:\/\//, "")}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.contact} aria-labelledby="contact-title">
        <h2 id="contact-title" className={styles.sectionTitle}>
          Kontak pers
        </h2>
        <p className={styles.sheetNote}>Booking, pers, remix, dan lisensi.</p>
        <p className={styles.contactMail}>
          <a href={contactHref}>{contactEmail}</a>
        </p>
        <ul className={styles.links}>
          {listenLinks.map((link) => (
            <li key={link.platform}>
              <a href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
                <span aria-hidden="true"> ↗</span>
                <span className="sr-only"> (membuka tab baru)</span>
              </a>
            </li>
          ))}
          {socialLinks.map((link) => (
            <li key={link.platform}>
              <a href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
                <span aria-hidden="true"> ↗</span>
                <span className="sr-only"> (membuka tab baru)</span>
              </a>
            </li>
          ))}
          <li>
            <Link href="/contact">
              Halaman kontak<span aria-hidden="true"> →</span>
            </Link>
          </li>
        </ul>
      </section>

      <div className={styles.markStrip} aria-hidden="true">
        <Image src={anMark.src} alt="" width={anMark.width} height={anMark.height} loading="lazy" />
        <span>{artistLine}</span>
      </div>
    </Container>
  );
}
