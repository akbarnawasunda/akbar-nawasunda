import Image from "next/image";
import type { Metadata } from "next";

import { anMark, lockup, portraitAlt, portraitSize, portraitSources } from "@/assets/web";
import { Container } from "@/components/layout/Container";
import { GenreTape } from "@/components/layout/GenreTape";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SectionsView } from "@/components/content/SectionsView";
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
import { getPublicPage, getPublicPhotos } from "@/studio/public";
import styles from "./artist.module.css";

// Published Studio content is read per request so a publish shows immediately.


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

/* Round 26: photo slots and studio publishes land in the database after the build; ISR lets a
 * filled slot appear within a minute (and immediately after the studio's revalidatePath). */
export const revalidate = 60;

export default async function ArtistPage() {
  /* Round 26: the stage is a photo SLOT. Empty until the owner fills it from NAWA Studio — the
     band then shows an honest bone frame instead of borrowing the home page's photograph. */
  const photos = await getPublicPhotos();
  // Stored under the `about` key (see content-model.ts): the owner writes the bio in Studio and it
  // appears here, with no code change and no migration.
  const published = await getPublicPage("about");
  const hasBio = published !== null && published.sections.some((section) => section.visible);

  return (
    <Container>
      <section className={styles.intro} aria-labelledby="artist-title">
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Artist</p>
          <h1 id="artist-title" className={`${styles.title} ink`}>
            Akbar
            <span className={styles.titleLine}>Nawasunda<span className={styles.stop} aria-hidden="true">.</span></span>
          </h1>
          <p className={styles.lead}>{published?.lead.trim() || artistLine}</p>

          <div className={styles.actions}>
            <ButtonLink href={listenUrl} variant="primary" external>
              Dengar Sekarang
            </ButtonLink>
            <ButtonLink href="/epk" variant="secondary">
              Press Kit
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

        {/*
          The portrait, held in front of the page: a plate on a real vanishing point, with a sheet of
          the identity blue behind it. The studio photograph is the one asset shot for exactly this
          job, and a cardboard-thin frame around it was the least interesting thing the page could do
          with it.
        */}
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

      {/*
        Round 23: the artist page gets the one frame the home hero only wears as a backdrop — the
        empty stage with its single warm spot, full-bleed at last, on the site's one scroll engine.
        A portrait says who; an empty stage says where the work happens, and it is the only frame
        in the archive wide enough to breathe between the facts and the bio.
      */}
      <section className={styles.stageBand} aria-label="Panggung">
        <Depth className={styles.stageMedia} y={-64} perspective={1200}>
          {photos.panggung ? (
            <Image
              src={photos.panggung}
              alt=""
              fill
              sizes="100vw"
              loading="lazy"
              className={styles.stageImage}
            />
          ) : (
            <div className={styles.stageEmpty}>
              {/* A designed placeholder, not a message: the label's own mark, ghosted, holds the
                  frame until the owner fills the slot from NAWA Studio. */}
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
          )}
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
        {published && hasBio ? (
          <SectionsView sections={published.sections} />
        ) : (
          <>
            <p className={styles.paragraph}>{artistLongBio}</p>
            <p className={styles.paragraph}>
              Format kerja: {formatServices()}.
            </p>
            <p className={styles.paragraph}>{licensingNote}</p>
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
          <p className={styles.sectionNote}>Tonggak karier</p>
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
            Unduh Aset Logo
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
        Pers dan wawancara: <a href="/epk">Press Kit</a>
      </p>

    </Container>
  );
}
