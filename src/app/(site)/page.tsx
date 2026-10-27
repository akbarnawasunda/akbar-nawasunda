import type { Metadata } from "next";
import Image from "next/image";

import { anMark } from "@/assets/web";
import { ReleaseGrid, type ReleaseCard } from "@/components/content/ReleaseGrid";
import { ReleaseTicker } from "@/components/content/ReleaseTicker";
import { SectionsView } from "@/components/content/SectionsView";
import { TourSection } from "@/components/content/TourSection";
import { Container } from "@/components/layout/Container";
import { GenreTape } from "@/components/layout/GenreTape";
import { PlatformRow } from "@/components/layout/PlatformRow";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { VisualRail } from "@/components/media/VisualRail";
import { AnMonogram } from "@/components/three/AnMonogram";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Reveal } from "@/components/zine/Reveal";
import { getCatalogue } from "@/content/catalogue";
import { tourDates } from "@/content/tour";
import { visualItems } from "@/content/visuals";
import { siteConfig } from "@/config/site";
import { getPlatformLink } from "@/config/socials";
import { brandCard } from "@/lib/social-card";
import { artistJsonLd, serializeJsonLd } from "@/lib/structured-data";
import { getPublicPage } from "@/studio/public";

import styles from "./page.module.css";

/**
 * Homepage — "panggung" (round 36).
 *
 * Round 35's page was built out of stacking contexts: a `Depth` layer that translated the photograph
 * −70px, a `Plate3D` stage that rotated the type block in three dimensions, a scrim between them, and
 * a magnetic cursor floating over all of it. Each piece worked in isolation and the composition did
 * not: at phone widths the translated layers crossed into each other, the tilt pushed the foot of the
 * name into the buttons, and the cursor lagged a frame behind the hand.
 *
 * This page is the correction, and the correction is subtraction. There is no depth wrapper, no tilted
 * plate, no scrim and no custom cursor. The hero is four rows in one column — running head, wordmark,
 * the AN mark, one button — laid out by CSS Grid with a gap between each. Nothing translates, nothing
 * rotates, nothing overlaps anything else, and the browser draws its own pointer.
 *
 * The rest of the page is the same idea applied downwards: every band is in the normal flow, separated
 * by a hairline and `--section-padding`, so the page has the breathing room of a festival stage
 * instead of a collage.
 *
 *   hero            the name, the mark, one call to action
 *   running head    every title in the catalogue, scrubbed by the scroll
 *   releases        the whole discography as a grid — the reason the page exists
 *   tour            dates
 *   monogram        the liquid AN band
 *   visuals         the archive rail
 *   platforms       where to listen
 *   notes           whatever the owner published in the Studio
 *
 * Catalogue source: `getCatalogue()` — the same function `/music` reads. It cannot return an empty
 * list (`catalogueFloor()` is its floor), and the grid it feeds is server-rendered markup with no
 * `opacity: 0` anywhere on the path, so the songs are in the HTML even if every script fails.
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

/*
 * The artist's own listening pages, in the order a visitor looks for them. These are the owner's
 * verified profiles (`src/config/socials.ts`), not links invented for a release: they fill a card's
 * stream row when that release does not carry its own destination for the service.
 */
const listenFallbacks = (["spotify", "appleMusic", "youtube"] as const).map((platform) =>
  getPlatformLink(platform),
);

/* Round 26: photo slots and studio publishes land in the database after the build; ISR lets a
 * filled slot appear within a minute (and immediately after the studio's revalidatePath). */
export const revalidate = 60;

export default async function HomePage() {
  const catalogue = await getCatalogue();
  const home = await getPublicPage("home");
  const homeSections = home?.sections.filter((section) => section.visible) ?? [];

  const tickerItems = catalogue.map((item) => ({
    slug: item.slug,
    title: item.title,
    meta: item.meta,
  }));

  /*
   * Round 36 — the cards are built from the catalogue itself, not from a "featured" subset.
   *
   * Every release in the same list `/music` prints is a card: sleeve, year · format, bold title, and
   * the stream buttons. A release with no link of its own falls back to the artist's verified
   * profiles — the record is on those pages even when the catalogue row does not carry the
   * per-track URL — which is why no card is ever a dead end.
   */
  const artistStreams = listenFallbacks.map((link) => ({ label: link.label, href: link.href }));
  const cards: ReleaseCard[] = catalogue.map((item, index) => ({
    slug: item.slug,
    href: item.href,
    title: item.title,
    year: item.year,
    format: item.format,
    artwork: item.artwork,
    streams: item.links.length > 0 ? item.links.slice(0, 3) : artistStreams,
    featured: index === 0,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(artistJsonLd(`${siteConfig.url.replace(/\/$/, "")}/brand/an-mark.webp`)),
        }}
      />

      {/* ------------------------------------------------------------------ hero */}
      {/*
        Four rows, one column, a gap between each. The name is the top row, the mark is the middle,
        the button is the bottom — and because they are grid rows in the normal flow, none of them can
        land on top of another at any width. The old hero was a photograph with a −70px translate, a
        scrim and a tilting plate; all three are gone.
      */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroInner}>
          <div className={styles.masthead}>
            <p className={styles.kicker}>
              <span className={styles.live} aria-hidden="true" />
              {siteConfig.origin.replace(", Indonesia", "")} · sejak {siteConfig.since}
            </p>
            <p className={styles.kicker}>Produser · Remixer · DJ</p>
          </div>

          <h1 id="hero-title" className={`${styles.name} ink`}>
            Akbar Nawasunda
          </h1>

          {/*
            The mark, as a plain image. Round 35 tried to make the logos' own WebGL band do duty in
            the first viewport; a shader that has to compile before it can paint is a logo that
            flickers on a cold load. Here the mark is 174×112 of baked WebP with no wrapper, no
            parallax and no canvas — it is on screen at the first paint and never moves.
          */}
          <div className={styles.heroMark}>
            <Image
              className={styles.heroMarkImage}
              src={anMark.src}
              alt=""
              width={anMark.width}
              height={anMark.height}
              sizes="(min-width: 900px) 22rem, 55vw"
              priority
            />
          </div>

          <div className={styles.heroCta}>
            <ButtonLink href="#catalogue" variant="primary">
              Dengarkan Musik
            </ButtonLink>
            <p className={styles.heroSub}>Breakbeat, Indo Bass, Jedag Jedug — live dari Bandung Barat.</p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- running head */}
      <ReleaseTicker items={tickerItems} />

      {/* --------------------------------------------------------------- catalogue */}
      {/*
        Release-first: this band is the second thing on the page, directly under the hero, and the
        hero's only button scrolls to it. No `Reveal` wraps the grid — a reveal is an `opacity: 0`
        that waits for JavaScript, and the catalogue is the one thing on this page that must never
        wait for anything.
      */}
      <section className={styles.catalogue} id="catalogue" aria-labelledby="catalogue-title">
        <Container>
          <div className={styles.catalogueHead}>
            <h2 id="catalogue-title" className={styles.catalogueTitle}>
              Rilisan
            </h2>
            <p className={styles.catalogueCount}>
              {String(catalogue.length).padStart(2, "0")} rilis · sejak {siteConfig.since}
            </p>
          </div>

          <ReleaseGrid items={cards} />

          <div className={styles.catalogueFoot}>
            <ButtonLink href="/music" variant="secondary">
              Semua Rilis
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------------- tour */}
      <TourSection dates={tourDates} />

      {/* --------------------------------------------------------------- monogram */}
      {/*
        The mark at full width, in its own band, where it has room to be an object rather than a
        decoration behind the type. The horizontal rule above it is the only seam.
      */}
      <section className={styles.signature} aria-label="Monogram">
        <AnMonogram />
      </section>

      <GenreTape />

      {/* ---------------------------------------------------------------- archive */}
      <section className={styles.archive} id="visuals" aria-labelledby="visuals-title">
        <Container>
          {/*
            The archive header keeps its entrance — it is five bands below the fold, so a block that
            rises once as it arrives is a courtesy, not a gate. The catalogue above is deliberately
            *not* wrapped: a reveal is an `opacity: 0` that waits for JavaScript, and the songs are
            the one thing on this page that must never wait for anything.
          */}
          <Reveal>
            <SectionHeader
              eyebrow="Arsip"
              title="Visual"
              id="visuals-title"
              action={{ href: getPlatformLink("youtube").href, label: "YouTube" }}
            />
          </Reveal>
        </Container>
        <VisualRail items={visualItems} />
      </section>

      <PlatformRow />

      {homeSections.length > 0 ? (
        <section className={styles.notesBand} aria-labelledby="catatan-title">
          <Container>
            <SectionHeader eyebrow="Catatan" title="Dari Studio" id="catatan-title" />
            <SectionsView sections={homeSections} />
          </Container>
        </section>
      ) : null}
    </>
  );
}
