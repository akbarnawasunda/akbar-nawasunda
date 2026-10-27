import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { editorialFrame } from "@/assets/web";
import { CataloguePin } from "@/components/content/CataloguePin";
import { ReleaseCover } from "@/components/content/ReleaseCover";
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
import { Depth } from "@/components/zine/Depth";
import { Magnetic } from "@/components/zine/Magnetic";
import { Plate3D } from "@/components/zine/Plate3D";
import { Reveal } from "@/components/zine/Reveal";
import { getCatalogue } from "@/content/catalogue";
import { tourDates } from "@/content/tour";
import { visualItems } from "@/content/visuals";
import { siteConfig } from "@/config/site";
import { getPlatformLink, listenUrl } from "@/config/socials";
import { brandCard } from "@/lib/social-card";
import { artistJsonLd, serializeJsonLd } from "@/lib/structured-data";
import { getPublicPage, getPublicPhotos } from "@/studio/public";

import styles from "./page.module.css";

/**
 * Homepage — "platform" (round 34).
 *
 * The reference is martingarrix.com, and the structural lesson from it is not decoration: a festival
 * artist's front page is *release-first and date-first*. A visitor arrives from a poster or a story
 * with two questions — "what came out?" and "are you playing near me?" — and a page that answers
 * them in the first two screens is doing its job. So the order is:
 *
 *   1. the name, at poster scale, with the two actions that matter (Latest Release · Tour Dates);
 *   2. the liquid AN band, flush under the hero — the mark is the identity, not an illustration;
 *   3. the running head (every release, scrubbed by the scroll);
 *   4. the release spotlight: one square sleeve, its year and format, and the places to hear it;
 *   5. the tour matrix: four columns, one hairline per row;
 *   6. the catalogue reel, the genre tape, the visual archive, the platform strip;
 *   7. whatever the owner has published in the Studio as extra notes.
 *
 * What left this round, on purpose: the facts bar (release counts and years active are a résumé, not
 * a mainstage), the paper About spread (the long bio lives on /artist and /epk), the press sheet
 * (/epk is a real route), and the night photograph that carried one quote and no information.
 *
 * Catalogue source: `getCatalogue()` — the same function `/music` reads, Studio-published rows first
 * with the verified static list as the fallback. Before round 34 this page built its own list, which
 * is exactly how a release could ship to the catalogue and never reach the front page.
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
 * verified profiles (`src/config/socials.ts`), not links invented for a release: they are used only
 * to fill the spotlight pill row when the featured release does not carry its own destination for
 * that service.
 */
const listenFallbacks = (["spotify", "appleMusic", "youtube", "soundcloud"] as const).map((platform) =>
  getPlatformLink(platform),
);

/** The desktop-safe key for a service name: "Apple Music" and "appleMusic" are the same pill. */
function serviceKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z]/g, "");
}

/* Round 26: photo slots and studio publishes land in the database after the build; ISR lets a
 * filled slot appear within a minute (and immediately after the studio's revalidatePath). */
export const revalidate = 60;

export default async function HomePage() {
  const catalogue = await getCatalogue();
  const featured = catalogue[0] ?? null;
  if (!featured) return null;

  const home = await getPublicPage("home");
  /* Round 26 photo slots: a studio upload wins, the repository asset is the fallback. */
  const photos = await getPublicPhotos();
  const homeSections = home?.sections.filter((section) => section.visible) ?? [];

  const tickerItems = catalogue.map((item) => ({
    slug: item.slug,
    title: item.title,
    meta: item.meta,
  }));

  /*
   * Where to hear it. Two sources, one order, no invention:
   *
   *   1. the release's own links (the loader has already sorted them streaming-first), then
   *   2. the artist's verified profiles for any of the four headline services the release does not
   *      carry itself.
   *
   * Round 34 fixed a quiet bug here: the previous code looked YouTube up in `socialLinks`, the social
   * block, where no YouTube entry exists — so the pill and the archive header action never rendered.
   * The channel lives in `listenLinks`; `getPlatformLink` is the accessor that knows that.
   */
  const streamLinks: { label: string; href: string }[] = [];
  const seenServices = new Set<string>();
  for (const link of [...featured.links, ...listenFallbacks]) {
    const key = serviceKey(link.label);
    if (seenServices.has(key)) continue;
    seenServices.add(key);
    streamLinks.push({ label: link.label, href: link.href });
    if (streamLinks.length === 4) break;
  }
  const streams =
    streamLinks.length > 0 ? streamLinks : [{ label: "Dengar Sekarang", href: listenUrl }];
  const catalogueIndex = String(1).padStart(2, "0");
  const catalogueTotal = String(catalogue.length).padStart(2, "0");

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
          <Image
            className={styles.heroImage}
            src={photos.latar ?? editorialFrame.webp}
            alt=""
            fill
            sizes="100vw"
            priority
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
                  <p className={styles.heroSub}>Breakbeat, Indo Bass, Jedag Jedug. Live set dari Bandung Barat.</p>

                  <div className={styles.heroActions}>
                    <Magnetic>
                      <ButtonLink href="#music" variant="primary">
                        Latest Release
                      </ButtonLink>
                    </Magnetic>
                    <Magnetic>
                      <ButtonLink href="#tour" variant="secondary">
                        Tour Dates
                      </ButtonLink>
                    </Magnetic>
                  </div>
                </div>
              </div>
            </Depth>
          </div>
        </Plate3D>
      </section>

      {/* --------------------------------------------------------------- monogram */}
      {/*
        The mark sits flush against the hero: both bands are the same ink, and any margin between
        them would draw a seam the page does not want. `display: block` + no margin is the whole
        contract; the band itself owns its height and its clip.
      */}
      <section className={styles.signature} aria-label="Monogram">
        <AnMonogram />
      </section>

      {/* ----------------------------------------------------------- running head */}
      <ReleaseTicker items={tickerItems} />

      {/* ------------------------------------------------------------- spotlight */}
      {/*
        The latest release, as a poster: one square sleeve at half the page, the facts a record has
        (year, format, position in the catalogue) and the places to hear it. This replaces the bone
        "transmission" sheet — same idea, no paper, no second title, and the sleeve is the object
        rather than an illustration beside copy.
      */}
      <section className={styles.spotlight} id="music" aria-labelledby="music-title">
        <Container>
          <div className={styles.spotlightHead}>
            <p className={styles.spotlightFlag}>
              <span className={styles.live} aria-hidden="true" />
              Sedang Beredar
            </p>
            <p className={styles.spotlightIndex}>
              {catalogueIndex} / {catalogueTotal}
            </p>
          </div>

          <div className={styles.spotlightBody}>
            <Reveal className={styles.spotlightCover}>
              <Plate3D
                className={styles.sleeveStage}
                data-plate="featured-sleeve"
                tiltY={9}
                tiltX={6}
                shift={10}
                perspective={1000}
              >
                <Link
                  href={featured.href}
                  className={styles.sleeveLink}
                  data-sleeve
                  aria-label={`Buka rilis ${featured.title}`}
                >
                  <span className={styles.sleeveEdge} aria-hidden="true" />
                  <span className={styles.sleeveFace}>
                    <ReleaseCover artwork={featured.artwork} title={featured.title} showTitle={false} />
                  </span>
                </Link>
              </Plate3D>
            </Reveal>

            <div className={styles.spotlightCopy}>
              <h2 id="music-title" className={styles.spotlightTitle}>
                {featured.title}
              </h2>
              <p className={styles.spotlightMeta}>{featured.meta}</p>

              <dl className={styles.gear}>
                <div className={styles.gearItem}>
                  <dt>Tahun</dt>
                  <dd>{featured.year ?? "—"}</dd>
                </div>
                <div className={styles.gearItem}>
                  <dt>Format</dt>
                  <dd>{featured.format}</dd>
                </div>
                <div className={styles.gearItem}>
                  <dt>Katalog</dt>
                  <dd>
                    {catalogueIndex}
                    <span className={styles.gearOf}> / {catalogueTotal}</span>
                  </dd>
                </div>
              </dl>

              <ul className={styles.streams} aria-label="Dengarkan rilisan ini">
                {streams.map((link) => (
                  <li key={`${link.label}-${link.href}`}>
                    <a
                      className={styles.stream}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.label}
                      <span className={styles.streamArrow} aria-hidden="true">
                        ↗
                      </span>
                      <span className="sr-only"> (membuka tab baru)</span>
                    </a>
                  </li>
                ))}
              </ul>

              <div className={styles.spotlightActions}>
                <Magnetic>
                  <ButtonLink href={featured.href} variant="primary">
                    Buka Rilis
                  </ButtonLink>
                </Magnetic>
                <Magnetic>
                  <ButtonLink href="/music" variant="secondary">
                    Semua Rilis
                  </ButtonLink>
                </Magnetic>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------------- tour */}
      <TourSection dates={tourDates} />

      {/* ---------------------------------------------------------------- catalogue */}
      <section className={styles.indexBand} id="catalogue" aria-labelledby="catalogue-title">
        <Container>
          <Reveal>
            <h2 id="catalogue-title" className={styles.indexTitle}>
              Indeks
            </h2>
          </Reveal>
          <p className={styles.railCount}>
            {catalogue.length} rilis · sejak {siteConfig.since}
          </p>
          <CataloguePin
            items={catalogue.map((item) => ({
              slug: item.slug,
              href: item.href,
              title: item.title,
              meta: item.meta,
              artwork: item.artwork,
            }))}
          />
        </Container>
      </section>

      <GenreTape />

      {/* ---------------------------------------------------------------- archive */}
      <section className={styles.archive} id="visuals" aria-labelledby="visuals-title">
        <Container>
          <Depth y={26} fade={0.08}>
            <SectionHeader
              eyebrow="Arsip"
              title="Visual"
              id="visuals-title"
              action={{ href: getPlatformLink("youtube").href, label: "YouTube" }}
            />
          </Depth>
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
