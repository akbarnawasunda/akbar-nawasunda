import type { Metadata } from "next";
import Link from "next/link";

import { anMark, portraitAlt, portraitSources } from "@/assets/web";
import { Container } from "@/components/layout/Container";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { artistFacts, artistLine } from "@/content/artist";
import { siteConfig } from "@/config/site";
import { listenUrl, socialLinks } from "@/config/socials";
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
 * journalist gets one download instead of right-clicking images. Nothing in it claims anything that
 * is not in FACTS_AND_VERIFICATION_2.md; the bio is one verified line, not an invented paragraph.
 */
export default function EpkPage() {
  return (
    <Container>
      <header className={styles.head}>
        <p className={styles.eyebrow}>04 — Press kit</p>
        <h1 className={styles.title}>Electronic press kit</h1>
        <p className={styles.lead}>
          Semua yang dibutuhkan untuk menulis tentang Akbar Nawasunda: potret resmi, logo transparan,
          fakta terverifikasi, dan tautan platform. Satu unduhan, tanpa akun.
        </p>
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
            Jangan menambahkan angka pendengar, penghargaan, atau tautan platform di luar daftar di
            halaman ini.
          </p>
        </section>

        <aside className={styles.preview} aria-label="Potret resmi">
          <picture>
            <source
              type="image/avif"
              srcSet={portraitSources.map((source) => `${source.avif} ${source.width}w`).join(", ")}
              sizes="(min-width: 1024px) 320px, 92vw"
            />
            <source
              type="image/webp"
              srcSet={portraitSources.map((source) => `${source.webp} ${source.width}w`).join(", ")}
              sizes="(min-width: 1024px) 320px, 92vw"
            />
            <img
              src={portraitSources[0].webp}
              alt={portraitAlt}
              width={portraitSources[0].width}
              height={portraitSources[0].height}
              loading="lazy"
              decoding="async"
            />
          </picture>
          <p className={styles.previewCaption}>Potret resmi · press-photo-print.jpg</p>
        </aside>
      </div>

      <section className={styles.sheet} aria-labelledby="sheet-title">
        <div>
          <h2 id="sheet-title" className={styles.sectionTitle}>
            Fakta terverifikasi
          </h2>
          <p className={styles.sheetNote}>Dipakai apa adanya di siaran pers. Tanpa tambahan.</p>
        </div>

        <dl className={styles.facts}>
          {artistFacts.map((fact) => (
            <div key={fact.label} className={styles.fact}>
              <dt>{fact.label}</dt>
              <dd>{fact.value ?? <span className={styles.needs}>[NEEDS OWNER]</span>}</dd>
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
        <p className={styles.sheetNote}>
          Alamat email booking atau pers belum dikonfirmasi, jadi tidak dicantumkan di sini. Untuk
          sekarang, jalur resmi adalah kanal di bawah.
        </p>
        <ul className={styles.links}>
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
        <p className={styles.contactNeeds}>
          <span className={styles.needs}>[NEEDS OWNER]</span> Email booking/pers, kontak manajemen,
          dan bio panjang 150–200 kata.
        </p>
      </section>

      <div className={styles.markStrip} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
        <img src={anMark.src} alt="" width={anMark.width} height={anMark.height} loading="lazy" />
        <span>{artistLine}</span>
      </div>
    </Container>
  );
}
