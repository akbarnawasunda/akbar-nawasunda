import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { anMark } from "@/assets/web";

import { ReleaseCover } from "@/components/content/ReleaseCover";
import { ReleaseLedger, type LedgerItem } from "@/components/content/ReleaseLedger";
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
import { getCatalogue, type CatalogueItem } from "@/content/catalogue";
import { tourDates } from "@/content/tour";
import { visualItems } from "@/content/visuals";
import { genres, siteConfig } from "@/config/site";
import { getPlatformLink } from "@/config/socials";
import { brandCard } from "@/lib/social-card";
import { artistJsonLd, serializeJsonLd } from "@/lib/structured-data";
import { getPublicPage } from "@/studio/public";

import styles from "./page.module.css";

/**
 * Homepage — the mainstage edit (round 37).
 *
 * Round 36 removed the collision-prone layers and centred the page on one axis. The owner's verdict
 * on that was fair and specific: it had stopped being broken but it had become a template — label,
 * giant centred name, logo, button, all stacked down the middle. A festival front page is not
 * symmetric; it is a poster with a heavy left edge and something floating beside it.
 *
 * So the composition is asymmetric now, and the asymmetry is the whole design:
 *
 *   1. **hero** — a small technical line at the top left ("LIVE SET & ELECTRONIC PRODUCTION //
 *      BANDUNG BARAT"), the name set massive and flush left, the liquid-chrome AN floating in the
 *      right half, and a two-link status deck under the name. Nothing is centred.
 *   2. **release** — a 50/50 split: the record as an object on the left (square, one neon hairline),
 *      the technical deck on the right ("TRACK 01 // NEW RELEASE", the title massive, genre / year /
 *      format, three laser buttons).
 *   3. **discography** — everything else as a ledger: a row per release, a hairline between, a small
 *      sleeve, a bold title, one link.
 *   4. tour, genre tape, archive, platforms, notes.
 *
 * What is deliberately absent: no tilted plates, no depth wrappers, no translated photographs, no
 * custom cursor, and no animation that moves one element across another. The only motion in the first
 * two bands is the mercury surface itself, which is a shader inside its own box.
 *
 * Catalogue source: `getCatalogue()` — the same function `/music` reads, floored by
 * `catalogueFloor()`, so it cannot return an empty list. The ledger and the spotlight are server
 * markup: the songs are in the HTML even if every script fails.
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

/**
 * Where to hear the record. The release's own links first, then the artist's verified profiles for
 * any of the three headline services the release does not carry itself — the record is on those pages
 * even when the catalogue row has no per-track URL. Nothing is invented: every href is the owner's.
 */
const listenFallbacks = (["spotify", "appleMusic", "youtube"] as const).map((platform) =>
  getPlatformLink(platform),
);

function serviceKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z]/g, "");
}

function streamLinksFor(item: CatalogueItem | undefined): { label: string; href: string }[] {
  const merged: { label: string; href: string }[] = [];
  const seen = new Set<string>();
  for (const link of [...(item?.links ?? []), ...listenFallbacks]) {
    const key = serviceKey(link.label);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ label: link.label, href: link.href });
    if (merged.length === 3) break;
  }
  return merged;
}

/* Round 26: photo slots and studio publishes land in the database after the build; ISR lets a
 * filled slot appear within a minute (and immediately after the studio's revalidatePath). */
export const revalidate = 60;

export default async function HomePage() {
  const catalogue = await getCatalogue();
  const home = await getPublicPage("home");
  const homeSections = home?.sections.filter((section) => section.visible) ?? [];

  /* The spotlight takes the owner's first entry — the list order is theirs, not a computed "latest"
     (half the catalogue has no confirmed date to sort by). The ledger takes the rest. */
  const featured = catalogue[0];
  const rest = catalogue.slice(1);

  /*
   * Is the spotlight's sleeve a real cover, or the generated plate?
   *
   * `@sleeve.webp` is the offline-rendered placeholder: by design it carries no type (round 19), which
   * is fine at 4rem in a list and wrong at 700px on a stage — photographed, it is a large empty bone
   * square. The owner's rule for that case is exact: a #14263A panel with the song's title in the
   * middle. So the placeholder is not used as the hero image; the panel is.
   */
  const featuredArt = featured?.artwork ?? null;
  const realArtwork = featuredArt?.kind === "image" && !featuredArt.src.includes("@sleeve");

  const streams = streamLinksFor(featured);
  const genreLine = genres.slice(0, 3).join(" / ");

  const ledger: LedgerItem[] = rest.map((item) => ({
    slug: item.slug,
    href: item.href,
    title: item.title,
    year: item.year,
    format: item.format,
    artwork: item.artwork,
  }));

  const tickerItems = catalogue.map((item) => ({
    slug: item.slug,
    title: item.title,
    meta: item.meta,
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
        Asymmetric on purpose. The label spans the full width at the top (a technical credit line),
        the name takes the left column and is flush left, the chrome mark floats in the right column
        and is allowed to be taller than the type next to it, and the status deck closes the left
        column. Three grid areas, no centring, nothing taken out of the flow.
      */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroInner}>
          <p className={styles.heroLabel}>Live Set &amp; Electronic Production // Bandung Barat</p>

          <h1 id="hero-title" className={`${styles.heroName} ink`}>
            Akbar
            <br />
            Nawasunda
          </h1>

          {/*
            The liquid-chrome AN. It lives in its own box (`data-shader-band`), so the shader's
            internal layers stay inside that box and never become the hero's furniture. Under it is
            the baked still: if WebGL is missing, or the context is lost, the mark is still there.
          */}
          <div className={styles.heroMark} data-shader-band>
            <AnMonogram />
          </div>

          <div className={styles.heroDeck}>
            <Link href="#release" className={styles.deckLink}>
              latest release
              <span className={styles.deckArrow} aria-hidden="true">
                →
              </span>
            </Link>
            <Link href="#tour" className={styles.deckLink}>
              live schedule
              <span className={styles.deckArrow} aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- spotlight */}
      {/*
        50/50, and it stays 50/50 on a laptop. The record is an object on the left — square, one neon
        hairline, no radius — and the right half is a technical deck: track number, title, three
        specs, three destinations. On a phone the deck stacks under the artwork.
      */}
      {featured ? (
        <section className={styles.release} id="release" aria-labelledby="release-title">
          <Container>
            <div className={styles.releaseGrid}>
              <div className={styles.releaseArt}>
                {realArtwork ? (
                  <Link
                    href={featured.href}
                    className={styles.artLink}
                    aria-label={`Buka rilis ${featured.title}`}
                  >
                    <ReleaseCover
                      artwork={featured.artwork}
                      title={featured.title}
                      showTitle={false}
                      alt=""
                      priority
                    />
                  </Link>
                ) : (
                  /*
                   * The panel from the brief: #14263A, the AN mark, the track title centred. It is
                   * deliberately NOT a link — the words inside it are visible text, so wrapping it in
                   * an `aria-label`led anchor would fail WCAG 2.5.3 again. The link is the button below.
                   */
                  <div className={styles.artPanel} data-cover="fallback">
                    <Image
                      className={styles.artPanelMark}
                      src={anMark.src}
                      alt=""
                      width={anMark.width}
                      height={anMark.height}
                      sizes="(min-width: 1024px) 12rem, 30vw"
                    />
                    <p className={styles.artPanelTitle}>{featured.title}</p>
                  </div>
                )}
              </div>

              <div className={styles.releaseDeck}>
                <p className={styles.trackLabel}>
                  <span className={styles.trackDot} aria-hidden="true" />
                  Track 01 // New Release
                </p>

                <h2 id="release-title" className={styles.releaseTitle}>
                  {featured.title}
                </h2>

                <dl className={styles.specs}>
                  <div className={styles.spec}>
                    <dt>Genre</dt>
                    <dd>{genreLine}</dd>
                  </div>
                  <div className={styles.spec}>
                    <dt>Tahun</dt>
                    <dd>{featured.year ?? "—"}</dd>
                  </div>
                  <div className={styles.spec}>
                    <dt>Format</dt>
                    <dd>{featured.format}</dd>
                  </div>
                </dl>

                <ul className={styles.lasers} aria-label={`Dengarkan ${featured.title}`}>
                  {streams.map((link) => (
                    <li key={`${link.label}-${link.href}`}>
                      <a
                        className={styles.laser}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.label}
                        <span className="sr-only"> (membuka tab baru)</span>
                      </a>
                    </li>
                  ))}
                </ul>

                <div className={styles.releaseActions}>
                  <ButtonLink href={featured.href} variant="secondary">
                    Buka Rilis
                  </ButtonLink>
                </div>
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- discography */}
      {/*
        The rest of the catalogue, as a running order. No `Reveal` on this band: a reveal is an
        `opacity: 0` that waits for JavaScript, and the songs are the one thing on this page that must
        never wait for anything.
      */}
      <section className={styles.discography} id="catalogue" aria-labelledby="catalogue-title">
        <Container>
          <div className={styles.discographyHead}>
            <h2 id="catalogue-title" className={styles.discographyTitle}>
              Discography
            </h2>
            <p className={styles.discographyCount}>
              {String(catalogue.length).padStart(2, "0")} rilis · sejak {siteConfig.since}
            </p>
          </div>

          <ReleaseLedger items={ledger} startAt={2} />

          <div className={styles.discographyFoot}>
            <ButtonLink href="/music" variant="secondary">
              Semua Rilis
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* ----------------------------------------------------------- running head */}
      <ReleaseTicker items={tickerItems} />

      {/* ------------------------------------------------------------------- tour */}
      <TourSection dates={tourDates} />

      <GenreTape />

      {/* ---------------------------------------------------------------- archive */}
      <section className={styles.archive} id="visuals" aria-labelledby="visuals-title">
        <Container>
          {/*
            The archive header keeps its entrance — it is several bands below the fold, so a block
            that rises once as it arrives is a courtesy, not a gate.
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
