import type { Metadata } from "next";
import Link from "next/link";

import { anMark, editorialFrame, portraitAlt, portraitSize, portraitSources } from "@/assets/web";
import { PaperAbout } from "@/components/content/PaperAbout";
import { ReleaseCover } from "@/components/content/ReleaseCover";
import { ReleaseTicker } from "@/components/content/ReleaseTicker";
import { SectionsView } from "@/components/content/SectionsView";
import { Container } from "@/components/layout/Container";
import { GenreTape } from "@/components/layout/GenreTape";
import { PlatformRow } from "@/components/layout/PlatformRow";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { VisualRail } from "@/components/media/VisualRail";
import { AnMonogram } from "@/components/three/AnMonogram";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Depth } from "@/components/zine/Depth";
import { Magnetic } from "@/components/zine/Magnetic";
import { Plate3D } from "@/components/zine/Plate3D";
import { Reveal } from "@/components/zine/Reveal";
import { coverArtwork } from "@/content/covers";
import { fromStaticRelease } from "@/content/release-view";
import { releases } from "@/content/releases";
import { heroStats } from "@/content/stats";
import { visualItems } from "@/content/visuals";
import { artistTimeline } from "@/content/artist";
import { siteConfig } from "@/config/site";
import { contactEmail, contactHref, listenUrl, socialLinks } from "@/config/socials";
import { brandCard } from "@/lib/social-card";
import { artistJsonLd, serializeJsonLd } from "@/lib/structured-data";
import { getPublicPage, getPublicPhotos } from "@/studio/public";

import styles from "./page.module.css";

/**
 * Homepage — "HUD" (round 16).
 *
 * The owner handed over a set of screenshots from a world-class artist site and named the standard:
 * pure black, pure white, type at 12vw in uppercase, thin cross marks, and nothing else. This page
 * is that standard applied to a ten-release catalogue:
 *
 *   1. the hero — the name at 12.5vw in two lines over a monochrome photograph, the facts on a rule;
 *   2. the monogram — the 3D mark, full-bleed, on black, immediately after the name. It is the
 *      centrepiece, so it comes second: a visitor sees the name, then the object, then the work;
 *   3. the running head — the catalogue as one scrub-scrolled line of display type;
 *   4. the transmission — the newest release as a spread;
 *   5. the index — all ten releases as ruled rows that invert under the pointer;
 *   6. the bands — night frame, platforms, genres, about, archive, press, press kit.
 *
 * What is deliberately absent: every sentence that explains the website to the reader ("dihitung
 * dari katalog", "sengaja tidak ada formulir"), every `[NEEDS OWNER]` marker, any rounded corner,
 * any coloured panel. A missing fact is now simply not printed; the Studio still tracks it.
 *
 * Copy rules that remain non-negotiable: counts are derived (src/content/stats.ts), every platform
 * link comes from the owner's own files (D-090), and nothing unverified is stated. No stream totals,
 * no awards, no tour dates — there are none to show.
 */
export const metadata: Metadata = {
  title: {
    absolute: `${siteConfig.name} — Produser, Remixer, DJ asal Bandung Barat`,
  },
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    url: "/",
    images: [brandCard(siteConfig.name, "produser, remixer, DJ")],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [brandCard(siteConfig.name, "produser, remixer, DJ").url],
  },
};

const youtube = socialLinks.find((link) => link.platform === "youtube");
const catalogue = releases.map((release) => ({
  ...fromStaticRelease(release, null),
  artwork: coverArtwork(release.slug),
}));
const featured = catalogue[0];
const stats = heroStats({ since: siteConfig.since, origin: siteConfig.origin });
const officialLinkCount = releases.length + socialLinks.length;

/** One sleeve path per release, for the index preview. `release.cover` first, then the waterfall. */

const tickerItems = catalogue.map((item) => ({
  slug: item.slug,
  title: item.title,
  meta: item.meta,
}));

/** Only the milestones that are documented; a gap is silent, not a stamped hole. */
const timeline = artistTimeline.filter((entry) => !entry.pending);

/* Round 26: photo slots and studio publishes land in the database after the build; ISR lets a
 * filled slot appear within a minute (and immediately after the studio's revalidatePath). */
export const revalidate = 60;

export default async function HomePage() {
  if (!featured) return null;
  const home = await getPublicPage("home");
  /* Round 26 photo slots: a studio upload wins, the repository asset is the fallback. */
  const photos = await getPublicPhotos();
  const homeSections = home?.sections.filter((section) => section.visible) ?? [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(artistJsonLd(`${siteConfig.url.replace(/\/$/, "")}/brand/an-mark.webp`)),
        }}
      />

      {/* The hero image is the LCP element: preloaded, fetched at high priority, never lazy. */}
      <link
        rel="preload"
        as="image"
        type="image/avif"
        href={photos.latar ?? editorialFrame.webp}
        fetchPriority="high"
      />

      {/* ------------------------------------------------------------------ hero */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <Depth className={styles.heroMedia} y={-70} scale={0.05} perspective={1400} data-layer="hero-photo">
          {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed art direction, exact crop */}
          <img
            className={styles.heroImage}
            src={photos.latar ?? editorialFrame.webp}
            alt=""
            width={editorialFrame.width}
            height={editorialFrame.height}
            fetchPriority="high"
            decoding="async"
          />
        </Depth>
        <div className={styles.heroScrim} aria-hidden="true" />

        <Plate3D
          className={styles.heroStage}
          data-plate="hero-stage"
          tiltY={2}
          tiltX={0.5}
          shift={6}
          perspective={1300}
        >
          <div className={styles.heroInner}>
            <div className={styles.masthead} data-depth="hero-masthead">
              <p className={styles.kicker}>
                <span className={styles.live} aria-hidden="true" />
                {siteConfig.origin.replace(", Indonesia", "")} · sejak {siteConfig.since}
              </p>
              <p className={styles.kicker}>Produser · Remixer · DJ</p>
            </div>

            <Depth className={styles.heroText} y={-26} data-layer="hero-type">
              <div className={styles.heroBody}>
                <h1 id="hero-title" className={`${styles.name} ink`} data-depth="hero-name">
                  <span className={styles.nameLine}>
                    <span className={styles.nameRise}>Akbar</span>
                  </span>
                  <span className={styles.nameLine}>
                    <span className={styles.nameRise}>
                      Nawasunda<span className={styles.stop} aria-hidden="true">.</span>
                    </span>
                  </span>
                </h1>

                <div className={styles.heroFoot} data-depth="hero-foot">
                  <p className={styles.heroSub}>
                    Breakbeat, Indo Bass, Jedag Jedug. Direkam di studio rumah, Bandung Barat.
                  </p>

                  <div className={styles.heroActions}>
                    <Magnetic>
                      <ButtonLink href={listenUrl} variant="primary" external>
                        Dengar Sekarang
                      </ButtonLink>
                    </Magnetic>
                    <Magnetic>
                      <ButtonLink href="#music" variant="secondary">
                        Lihat Katalog
                      </ButtonLink>
                    </Magnetic>
                  </div>
                </div>
              </div>
            </Depth>

            <div className={styles.factsBar} data-depth="hero-facts">
              <dl className={styles.facts}>
                <div className={styles.fact}>
                  <dt>Rilis</dt>
                  <dd>{stats.releaseCount}</dd>
                </div>
                <div className={styles.fact}>
                  <dt>Tahun aktif</dt>
                  <dd>{stats.yearsActive}</dd>
                </div>
                <div className={styles.fact}>
                  <dt>Tautan resmi</dt>
                  <dd>{officialLinkCount}</dd>
                </div>
              </dl>
              <p className={styles.cue} aria-hidden="true">
                <span>Gulir</span>
                <span className={styles.cueLine} />
              </p>
            </div>
          </div>
        </Plate3D>
      </section>

      {/* --------------------------------------------------------------- monogram */}
      {/*
        The centrepiece, second only to the name.

        It is a full-bleed black band with the 3D mark as the only object on it and one line of
        mono copy at the bottom edge. No photograph, no gradient, no rule behind it: the metal is
        the light source, and a second bright thing on the same screen would halve it.
      */}
      <section className={styles.signature} aria-label="Monogram">
        <AnMonogram />
        {/*
          Below 768px the renderer never mounts (R14: bloom on a phone GPU is not worth the frames),
          so the band used to be 74svh of empty black on every phone. This is the mark itself — the
          same file the header and the footer use — set at the size the object would have occupied.
        */}
        <span className={styles.signatureFallback} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, exact bytes */}
          <img src={anMark.src} alt="" width={anMark.width} height={anMark.height} loading="lazy" decoding="async" />
        </span>
      </section>

      {/* ----------------------------------------------------------- running head */}
      <ReleaseTicker items={tickerItems} />

      {/* ------------------------------------------------------------- transmission */}
      <section className={styles.transmission} id="music" aria-labelledby="music-title">
        <Container>
          <div className={styles.transmissionHead}>
            <p className={styles.sectionNumber}>03 — Rilis terbaru</p>
            <Link className={styles.sectionLink} href="/music">
              Semua rilis <span aria-hidden="true">→</span>
            </Link>
          </div>

          <p className={styles.transmissionFlag}>
              <span className={styles.live} aria-hidden="true" />
              Sedang beredar
            </p>
            <h2 id="music-title" className={styles.transmissionTitle}>
              {featured.title}
            </h2>

            <div className={styles.transmissionBody}>
              <div className={styles.transmissionCopy}>
                <p className={styles.transmissionMeta}>{featured.meta}</p>
              <div className={styles.transmissionActions}>
                <Magnetic>
                  <ButtonLink href={featured.href} variant="primary">
                    Buka rilis
                  </ButtonLink>
                </Magnetic>
              </div>
            </div>

            <Reveal className={styles.transmissionArt}>
              <Plate3D className={styles.sleeveStage} data-plate="featured-sleeve" tiltY={11} tiltX={7} shift={12} perspective={1000}>
                <Link href={featured.href} className={styles.sleeveLink} data-sleeve aria-label={`Buka rilis ${featured.title}`}>
                  <span className={styles.sleeveEdge} aria-hidden="true" />
                  <span className={styles.sleeveFace}>
                    <ReleaseCover artwork={featured.artwork} title={featured.title} shape="square" showTitle={false} />
                  </span>
                </Link>
              </Plate3D>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------------ index */}
      <section className={styles.indexBand} aria-labelledby="catalogue-title">
        <Container>
          <div className={styles.transmissionHead}>
            <p className={styles.sectionNumber}>04 — Katalog</p>
            <p className={styles.sectionNote}>{String(stats.releaseCount).padStart(2, "0")} rilis</p>
          </div>
          <h2 id="catalogue-title" className={styles.indexTitle}>
            Indeks
          </h2>
          {/*
            Round 23: the index is the data, the rail is the object. Ten sleeves in a horizontal
            scroll-snap rail under the rows — native overflow, no script, no second loop — because
            a discography you can push sideways with a thumb is the one catalogue gesture a major
            label site never drops. The rows stay for the readers; the rail is for the hands.
          */}
          <div className={styles.railWrap}>
            <ol className={styles.rail} aria-label="Diskografi">
              {catalogue.map((item) => (
                <li className={styles.railItem} key={item.slug} data-rail-item>
                  <Link
                    className={styles.railLink}
                    href={item.href}
                    aria-label={`Buka rilis ${item.title}`}
                  >
                    <ReleaseCover artwork={item.artwork} title={item.title} showTitle={false} />
                  </Link>
                  <p className={styles.railTitle}>{item.title}</p>
                  <p className={styles.railMeta}>{item.meta}</p>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------------- night */}
      <section className={styles.night} aria-label="Malam" data-section="night">
        <Depth className={styles.nightMedia} y={-90} perspective={1200}>
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative full-bleed frame */}
          <img
            src={photos.malam ?? "/media/stage-700.webp"}
            alt=""
            width={700}
            height={700}
            loading="lazy"
            decoding="async"
            className={styles.nightImage}
          />
        </Depth>
        <p className={styles.nightQuote}>
          “Tiga bahasa yang dipakai bergantian dalam satu set, direkam di studio rumah.”
        </p>
        <p className={styles.nightCaption}>Bandung Barat · rekaman studio rumah</p>
      </section>

      <PlatformRow />
      <GenreTape />

      <PaperAbout />

      {/* ---------------------------------------------------------------- archive */}
      <section className={styles.archive} id="visuals" aria-labelledby="visuals-title">
        <Container>
          <Depth y={26} fade={0.08}>
            <SectionHeader
              eyebrow="05 — Arsip"
              title="Visual"
              id="visuals-title"
              action={youtube ? { href: youtube.href, label: "YouTube" } : undefined}
            />
          </Depth>
        </Container>
        <VisualRail items={visualItems} />
      </section>

      {/* ------------------------------------------------------------------ press */}
      <section className={styles.pressBand} id="press" aria-labelledby="press-title">
        <Container>
          <div className={styles.pressWrap}>
            <div className={`paper ${styles.press}`}>
              <p className={styles.pressEyebrow}>06 — Press kit</p>
              <h2 id="press-title" className={styles.pressTitle}>
                Akbar Nawasunda
              </h2>

              <ol className={styles.timeline}>
                {timeline.map((entry) => (
                  <li key={`${entry.marker}-${entry.title}`}>
                    <span className={styles.timelineYear}>{entry.marker}</span>
                    <span className={styles.timelineBody}>
                      <span className={styles.timelineTitle}>{entry.title}</span>
                      <span className={styles.timelineDetail}>{entry.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <figure className={styles.pressPhoto}>
              <picture>
                <source
                  type="image/avif"
                  srcSet={portraitSources.map((source) => `${source.avif} ${source.width}w`).join(", ")}
                  sizes="(min-width: 1024px) 32vw, 86vw"
                />
                <source
                  type="image/webp"
                  srcSet={portraitSources.map((source) => `${source.webp} ${source.width}w`).join(", ")}
                  sizes="(min-width: 1024px) 32vw, 86vw"
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
              <figcaption className={styles.pressPhotoCaption}>Potret resmi</figcaption>
            </figure>
          </div>
        </Container>
      </section>

      {/* -------------------------------------------------------------------- epk */}
      <section className={styles.epkBand} aria-labelledby="epk-title">
        <Container>
          <div className={styles.epk}>
            <div>
              <p className={styles.sectionNumber}>07 — Booking &amp; pers</p>
              <h2 id="epk-title" className={styles.epkTitle}>
                Press kit
              </h2>
              <div className={styles.epkActions}>
                <Magnetic>
                  <ButtonLink href="/epk/akbar-nawasunda-epk.zip" variant="primary">
                    Unduh EPK (.zip)
                  </ButtonLink>
                </Magnetic>
                <ButtonLink href="/epk" variant="secondary">
                  Isi press kit
                </ButtonLink>
              </div>
            </div>
            <div className={styles.epkNote}>
              <p className={styles.epkNoteLabel}>Booking &amp; pers</p>
              <p className={styles.epkNoteValue}>
                <a href={contactHref}>{contactEmail}</a>
              </p>
            </div>
          </div>
        </Container>
      </section>

      {homeSections.length > 0 ? (
        <section className={styles.notesBand} aria-labelledby="catatan-title">
          <Container>
            <SectionHeader eyebrow="08 — Catatan" title="Dari Studio" id="catatan-title" />
            <SectionsView sections={homeSections} />
          </Container>
        </section>
      ) : null}
    </>
  );
}
