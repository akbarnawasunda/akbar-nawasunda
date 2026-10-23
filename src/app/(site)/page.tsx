import type { Metadata } from "next";

import { portraitAlt, portraitSize, portraitSources } from "@/assets/web";
import { ReleaseBento } from "@/components/content/ReleaseBento";
import { Container } from "@/components/layout/Container";
import { GenreTape } from "@/components/layout/GenreTape";
import { PlatformRow } from "@/components/layout/PlatformRow";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { SectionsView } from "@/components/content/SectionsView";
import { VisualGrid } from "@/components/media/VisualGrid";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { coverArtwork } from "@/content/covers";
import { fromStaticRelease } from "@/content/release-view";
import { releases } from "@/content/releases";
import { heroStats } from "@/content/stats";
import { homepageVisuals } from "@/content/visuals";
import { siteConfig } from "@/config/site";
import { getSocialLink, listenUrl } from "@/config/socials";
import { artistJsonLd, serializeJsonLd } from "@/lib/structured-data";
import { getPublicPage } from "@/studio/public";
import styles from "./page.module.css";

/**
 * Homepage — final anti-AI pass (2026-10-23).
 *
 * What is deliberately NOT here, because it is what made earlier versions read as generated:
 * no particle field, no dot-matrix blob, no WebGL canvas, no glowing sphere, no full-screen
 * gradient, no glass panel, no centred stack of six identical cards. The hero is a 60/40 split:
 * type on the left, the official portrait on the right, separated by a 1px rule and the surface
 * step. The only decoration on the page is a 2% grain layer (GrainOverlay, rendered by the layout).
 *
 * What carries the page instead: a real photograph as the LCP image, tight -0.02em display type,
 * 11px mono labels in #A1A1B5, and artwork-first release cards. Releasing artwork comes from
 * public/assets/covers/<slug>.* when the owner uploads it, and from a designed sleeve built out of
 * the title + AN mark + palette when they have not (src/components/content/ReleaseCover.tsx).
 *
 * Copy is limited to verified facts; counts are derived (src/content/stats.ts), not typed by hand.
 */
export const metadata: Metadata = {
  title: {
    absolute: `${siteConfig.name} — Produser, Remixer, DJ asal Bandung Barat`,
  },
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

const youtube = getSocialLink("youtube");
const catalogue = releases.map((release) => ({
  ...fromStaticRelease(release, null),
  artwork: coverArtwork(release.slug),
}));
const featured = catalogue[0];
const stats = heroStats({ since: siteConfig.since, origin: siteConfig.origin });

export default async function HomePage() {
  if (!featured) return null;
  // Studio-managed homepage sections (below the built-in hero, catalogue and archive). Nothing is
  // rendered until the owner publishes some, so the page is unchanged by default — but the Studio
  // editor is no longer a form that writes somewhere the site never reads.
  const home = await getPublicPage("home");
  // Structured data for search engines: only facts that are already on the page (see src/lib/structured-data.ts).
  const jsonLd = serializeJsonLd(artistJsonLd(`${siteConfig.url.replace(/\/$/, "")}/brand/an-mark.webp`));
  const homeSections = home?.sections.filter((section) => section.visible) ?? [];
  const rest = catalogue.slice(1, 6);

  return (
    <>
      {/* JSON-LD rather than microdata: one block, no markup noise, and the `<` escaping in
          serializeJsonLd means the payload cannot close the script element. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      {/*
        One preload only, for the AVIF variant: browsers without AVIF ignore it and discover the
        WebP <source> in the parser. A second preload would download both files.
      */}
      <link
        rel="preload"
        as="image"
        type="image/avif"
        imageSrcSet={portraitSources.map((source) => `${source.avif} ${source.width}w`).join(", ")}
        imageSizes="(min-width: 1024px) 40vw, 92vw"
        fetchPriority="high"
      />

      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroGrid}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowRule} aria-hidden="true" />
              {siteConfig.origin} • Since {siteConfig.since}
            </p>

            <h1 id="hero-title" className={styles.title}>
              <span>Akbar</span> <span>Nawasunda</span>
            </h1>

            <p className={styles.sub}>
              Produser, remixer, dan DJ asal Bandung Barat. Breakbeat / Indo Bass.
            </p>

            <div className={styles.actions}>
              <ButtonLink href={listenUrl} variant="primary" external>
                Dengar Sekarang
              </ButtonLink>
              <ButtonLink href="#visuals" variant="secondary">
                Lihat Visuals
              </ButtonLink>
            </div>

            {/* Two counters, mono 12px: a quiet line under the CTAs, not a dashboard. Both
                numbers are derived (src/content/stats.ts), never typed by hand. */}
            <dl className={styles.stats}>
              <div className={styles.stat}>
                <dd className={styles.statValue}>+{stats.yearsActive}</dd>
                <dt className={styles.statLabel}>tahun aktif</dt>
              </div>
              <div className={styles.stat}>
                <dd className={styles.statValue}>+{stats.releaseCount}</dd>
                <dt className={styles.statLabel}>rilis terverifikasi</dt>
              </div>
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
                  className={styles.portrait}
                  src={portraitSources[1].webp}
                  alt={portraitAlt}
                  width={portraitSize.width}
                  height={portraitSize.height}
                  fetchPriority="high"
                  decoding="async"
                />
              </picture>
              {/* The only treatment on the photograph: a bottom vignette so the frame edge never
                  cuts a hard line across the image. No gradient behind it, no glow. */}
              <span className={styles.vignette} aria-hidden="true" />
            </div>
            <figcaption className={styles.caption}>
              <span aria-hidden="true" />
              Potret resmi
            </figcaption>
          </figure>
        </div>
      </section>

      <PlatformRow />
      <GenreTape />

      <section className={styles.section} id="music" aria-labelledby="music-title">
        <Container>
          <SectionHeader
            eyebrow="01 — Katalog"
            title="Rilis terbaru"
            id="music-title"
            action={{ href: "/music", label: "Semua rilis" }}
          />

          <ReleaseBento featured={featured} rest={rest} total={stats.releaseCount} />

          <p className={styles.footnote}>
            Tahun rilis, artwork, dan tautan platform per rilis belum dikonfirmasi pemilik katalog.{" "}
            <span className={styles.placeholder}>[NEEDS OWNER]</span>
          </p>
        </Container>
      </section>

      <section className={styles.section} id="visuals" aria-labelledby="visuals-title">
        <Container>
          <SectionHeader
            eyebrow="02 — Visual"
            title="Arsip visual"
            id="visuals-title"
            action={{ href: youtube.href, label: "YouTube" }}
          />
          <VisualGrid items={homepageVisuals} />
          <p className={styles.footnote}>
            Enam aset resmi. Video dan still panggung akan menyusul di{" "}
            <a href="/visuals">halaman Visuals</a>.
          </p>
        </Container>
      </section>

      {homeSections.length > 0 ? (
        <section className={styles.section} aria-labelledby="catatan-title">
          <Container>
            <SectionHeader eyebrow="03 — Catatan" title="Dari Studio" id="catatan-title" />
            <SectionsView sections={homeSections} />
          </Container>
        </section>
      ) : null}
    </>
  );
}
