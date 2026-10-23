import type { Metadata } from "next";

import { anMark, lockup, portraitAlt, portraitSize, portraitSources } from "@/assets/web";
import { Container } from "@/components/layout/Container";
import { GenreTape } from "@/components/layout/GenreTape";
import { PlatformRow } from "@/components/layout/PlatformRow";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SectionsView } from "@/components/content/SectionsView";
import {
  artistBioNeeded,
  artistFacts,
  artistLine,
  artistTimeline,
} from "@/content/artist";
import { siteConfig } from "@/config/site";
import { listenUrl } from "@/config/socials";
import { pageMetadata } from "@/lib/metadata";
import { getPublicPage } from "@/studio/public";
import styles from "./artist.module.css";

// Published Studio content is read per request so a publish shows immediately.
export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Artist",
  description:
    "Akbar Nawasunda (Idel Akbar Ramadan), produser, remixer, dan DJ asal Bandung Barat. Dari alias DJ Akbar Remix sejak 2020 ke Akbar Nawasunda.",
  path: "/artist",
});

/**
 * Artist page — D-024: /artist is canonical and /about redirects here with a 308.
 *
 * Layout follows the same editorial rules as the rest of the site: an asymmetric split (portrait
 * right, facts left), a hairline timeline whose year column is mono, and no invented biography. The
 * long bio has not been written by the owner yet, so the page carries a short verified line and a
 * clearly marked gap instead of prose.
 */
export default async function ArtistPage() {
  // Stored under the `about` key (see content-model.ts): the owner writes the bio in Studio and it
  // appears here, with no code change and no migration.
  const published = await getPublicPage("about");
  const hasBio = published !== null && published.sections.some((section) => section.visible);

  return (
    <Container>
      <section className={styles.intro} aria-labelledby="artist-title">
        <div className={styles.copy}>
          <p className={styles.eyebrow}>03 — Artist</p>
          <h1 id="artist-title" className={styles.title}>
            Akbar Nawasunda
          </h1>
          <p className={styles.lead}>{published?.lead.trim() || artistLine}</p>

          <div className={styles.actions}>
            <ButtonLink href={listenUrl} variant="primary" external>
              Dengar Sekarang
            </ButtonLink>
            <ButtonLink href="/epk" variant="secondary">
              Press kit
            </ButtonLink>
          </div>

          <dl className={styles.facts}>
            {artistFacts.map((fact) => (
              <div key={fact.label} className={styles.fact}>
                <dt>{fact.label}</dt>
                <dd>{fact.value ?? <span className={styles.needs}>[NEEDS OWNER]</span>}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className={styles.visual}>
          <div className={styles.portraitFrame}>
            <picture>
              <source
                type="image/avif"
                srcSet={portraitSources.map((source) => `${source.avif} ${source.width}w`).join(", ")}
                sizes="(min-width: 1024px) 40vw, 92vw"
              />
              <source
                type="image/webp"
                srcSet={portraitSources.map((source) => `${source.webp} ${source.width}w`).join(", ")}
                sizes="(min-width: 1024px) 40vw, 92vw"
              />
              <img
                src={portraitSources[1].webp}
                alt={portraitAlt}
                width={portraitSize.width}
                height={portraitSize.height}
                loading="lazy"
                decoding="async"
              />
            </picture>
          </div>
          <figcaption className={styles.caption}>
            <span aria-hidden="true" />
            Potret resmi
          </figcaption>
        </figure>
      </section>

      <PlatformRow />
      <GenreTape />

      <section className={styles.bioSection} aria-labelledby="bio-title">
        <p className={styles.eyebrow}>Bio</p>
        <h2 id="bio-title" className={styles.sectionTitle}>
          {hasBio ? "Biografi" : "Yang belum ditulis"}
        </h2>
        {published && hasBio ? (
          <SectionsView sections={published.sections} />
        ) : (
          <>
            <p className={styles.paragraph}>
              Bio panjang belum ada di sumber resmi mana pun. Halaman ini tidak mengarang cerita
              karier; bagian berikut menunggu bahan dari pemilik.
            </p>
            <ul className={styles.needsList}>
              {artistBioNeeded.map((item) => (
                <li key={item}>
                  <span className={styles.needs}>[NEEDS OWNER]</span> {item}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className={styles.timelineSection} aria-labelledby="timeline-title">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Linimasa</p>
            <h2 id="timeline-title" className={styles.sectionTitle}>
              DJ Akbar Remix ke Akbar Nawasunda
            </h2>
          </div>
          <p className={styles.sectionNote}>
            Hanya tonggak yang terverifikasi. Baris bergaris putus-putus berarti periode itu belum
            terdokumentasi, bukan kosong.
          </p>
        </div>

        <ol className={styles.timeline}>
          {artistTimeline.map((entry) => (
            <li
              key={`${entry.marker}-${entry.title}`}
              className={entry.pending ? `${styles.entry} ${styles.pending}` : styles.entry}
            >
              <span className={styles.marker}>{entry.marker}</span>
              <div className={styles.entryBody}>
                <h3 className={styles.entryTitle}>
                  {entry.title}
                  {entry.pending ? <span className={styles.pendingTag}>[NEEDS OWNER]</span> : null}
                </h3>
                <p className={styles.entryDetail}>{entry.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.identitySection} aria-labelledby="identity-title">
        <div className={styles.identityCopy}>
          <p className={styles.eyebrow}>Identitas</p>
          <h2 id="identity-title" className={styles.sectionTitle}>
            Monogram dan lockup
          </h2>
          <p className={styles.paragraph}>
            Monogram AN dipakai di navigasi, kartu rilis, dan materi panggung. Lockup penuh dipakai
            saat nama perlu terbaca dari jauh. Keduanya tersedia sebagai PNG transparan di press kit.
          </p>
          <ButtonLink href="/epk" variant="ghost">
            Unduh aset logo
          </ButtonLink>
        </div>

        <div className={styles.marks}>
          <div className={styles.markPanel}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
            <img src={anMark.src} alt="Monogram AN" width={anMark.width} height={anMark.height} loading="lazy" />
            <span className={styles.markLabel}>Monogram</span>
          </div>
          <div className={styles.markPanel}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
            <img src={lockup.src} alt="Lockup Akbar Nawasunda RMX" width={lockup.width} height={lockup.height} loading="lazy" />
            <span className={styles.markLabel}>Lockup</span>
          </div>
        </div>
      </section>

      <p className={styles.contactHint}>
        Untuk wawancara atau materi pers, mulai dari <a href="/epk">press kit</a> — {siteConfig.origin}.
      </p>

    </Container>
  );
}
