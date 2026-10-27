import Image from "next/image";
import type { Metadata } from "next";

import { anMark, lockup, portraitAlt, portraitSize, portraitSources } from "@/assets/web";
import { Container } from "@/components/layout/Container";
import { GenreTape } from "@/components/layout/GenreTape";
import { ButtonLink } from "@/components/ui/ButtonLink";

import { Depth } from "@/components/zine/Depth";
import { Plate3D } from "@/components/zine/Plate3D";
import {
  artistFacts,
  artistLine,
  artistLongBio,
  artistServices,
  artistTimeline,
  licensingNote,
} from "@/content/artist";
import { listenUrl } from "@/config/socials";
import { pageMetadata } from "@/lib/metadata";
import styles from "./artist.module.css";

export const dynamic = "force-static";

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
 * right, facts left) and a hairline timeline whose year column is mono. The biography is the owner's
 * own text (D-090); the two things they have not supplied — 2021–2023 and the story behind the name —
 * are listed as gaps rather than written into the prose.
 */
/** "Permintaan remix, aransemen khusus, kolaborasi, dan lisensi musik" — no hard-coded last item. */
function formatServices(): string {
  const items = [...artistServices];
  const last = items.pop();
  return `${items.join(", ")}, dan ${(last ?? "").toLowerCase()}`;
}

export default function ArtistPage() {
  return (
    <Container>
      <section className={styles.intro} aria-labelledby="artist-title">
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Artist</p>
          <h1 id="artist-title" className={`${styles.title} ink`}>
            Akbar
            <span className={styles.titleLine}>Nawasunda<span className={styles.stop} aria-hidden="true">.</span></span>
          </h1>
          <p className={styles.lead}>{artistLine}</p>

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
                <dd>{fact.value ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className={styles.visual}>
          <Plate3D className={styles.portraitStage} data-plate="artist-portrait" tiltY={9} tiltX={6} shift={12}>
          <div className={styles.portraitFrame}>
            <span className={styles.portraitPlate} aria-hidden="true" />
            <Image
            src={portraitSources[1].webp}
            alt={portraitAlt}
            width={portraitSize.width}
            height={portraitSize.height}
            sizes="(min-width: 1024px) 40vw, 92vw"
            loading="lazy"
          />
          </div>
          </Plate3D>
          <figcaption className={styles.caption}>
            <span aria-hidden="true" />
            Potret resmi
          </figcaption>
        </figure>
      </section>

      <section className={styles.stageBand} aria-label="Panggung">
        <Depth className={styles.stageMedia} y={-64} perspective={1200}>
          <div className={styles.stageEmpty}>
            <Image
              src={anMark.src}
              alt=""
              width={anMark.width}
              height={anMark.height}
              sizes="(min-width: 768px) 24vw, 48vw"
              loading="lazy"
              className={styles.stageEmptyMark}
            />
          </div>
        </Depth>
        <p className={styles.stageCaption}>
          Panggung kosong · satu lampu sorot
        </p>
      </section>

      <GenreTape />

      <section className={styles.bioSection} aria-labelledby="bio-title">
        <p className={styles.eyebrow}>Bio</p>
        <h2 id="bio-title" className={styles.sectionTitle}>
          Biografi
        </h2>
        <p className={styles.paragraph}>{artistLongBio}</p>
        <p className={styles.paragraph}>
          Format kerja: {formatServices()}.
        </p>
        <p className={styles.paragraph}>{licensingNote}</p>
      </section>

      <section className={styles.timelineSection} aria-labelledby="timeline-title">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Linimasa</p>
            <h2 id="timeline-title" className={styles.sectionTitle}>
              DJ Akbar Remix ke Akbar Nawasunda
            </h2>
          </div>
          <p className={styles.sectionNote}>Tonggak terverifikasi</p>
        </div>

        <ol className={styles.timeline}>
          {artistTimeline
            .filter((entry) => !entry.pending)
            .map((entry) => (
            <li
              key={`${entry.marker}-${entry.title}`}
              className={styles.entry}
            >
              <span className={styles.marker}>{entry.marker}</span>
              <div className={styles.entryBody}>
                <h3 className={styles.entryTitle}>{entry.title}</h3>
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
            Monogram AN dan lockup penuh, tersedia sebagai PNG transparan di press kit.
          </p>
          <ButtonLink href="/epk" variant="ghost">
            Unduh aset logo
          </ButtonLink>
        </div>

        <div className={styles.marks}>
          <div className={styles.markPanel}>
            <Image src={anMark.src} alt="Monogram AN" width={anMark.width} height={anMark.height} loading="lazy" />
            <span className={styles.markLabel}>Monogram</span>
          </div>
          <div className={styles.markPanel}>
            <Image
              src={lockup.src}
              alt="Lockup Akbar Nawasunda RMX"
              width={lockup.width}
              height={lockup.height}
              loading="lazy"
            />
            <span className={styles.markLabel}>Lockup</span>
          </div>
        </div>
      </section>

      <p className={styles.contactHint}>
        Pers dan wawancara: <a href="/epk">press kit</a>
      </p>

    </Container>
  );
}