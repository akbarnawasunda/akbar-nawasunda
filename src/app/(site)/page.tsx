import type { Metadata } from "next";

import { anMark, lockup, portraitAlt, portraitSize, portraitSources, stageFrame } from "@/assets/web";
import { SignalField } from "@/components/effects/SignalField";
import { ReleaseBento } from "@/components/content/ReleaseBento";
import { Container } from "@/components/layout/Container";
import { GenreTape } from "@/components/layout/GenreTape";
import { PlatformRow } from "@/components/layout/PlatformRow";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { VisualGrid, type VisualItem } from "@/components/media/VisualGrid";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { resolveCover } from "@/content/covers";
import { fromStaticRelease } from "@/content/release-view";
import { releases } from "@/content/releases";
import { heroStats } from "@/content/stats";
import { siteConfig } from "@/config/site";
import { getSocialLink, listenUrl } from "@/config/socials";
import styles from "./page.module.css";

/**
 * Homepage — Phase 2 revision from the owner's four references.
 *
 * Composition rules that keep it from reading as a generated template:
 * - an asymmetric split hero (55/45) whose H1 runs across the column boundary;
 * - the Liquid Signal as a dot-matrix SVG, not a solid glowing sphere;
 * - depth from surface steps and 1px hairlines, never from glass or full-bleed gradients;
 * - a bento catalogue (one 16:9 card, four squares, one wide tile, one CTA) instead of a row of
 *   identical cards.
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
const catalogue = releases.map((release) => fromStaticRelease(release, resolveCover(release.slug)));
const featured = catalogue[0];
const stats = heroStats({ since: siteConfig.since, origin: siteConfig.origin });

const visuals: readonly VisualItem[] = [
  {
    id: "portrait",
    src: "/media/portrait-480.webp",
    full: "/media/portrait-960.webp",
    caption: "Potret resmi",
    alt: portraitAlt,
  },
  {
    id: "mark",
    src: anMark.src,
    caption: "Monogram AN",
    alt: "Monogram AN Akbar Nawasunda, garis putih dengan ujung biru",
    onSurface: true,
  },
  {
    id: "lockup",
    src: lockup.src,
    caption: "Lockup resmi",
    alt: "Lockup Akbar Nawasunda RMX dengan monogram dan wordmark",
    onSurface: true,
  },
  {
    id: "stage",
    src: stageFrame.thumb.webp,
    full: stageFrame.webp,
    caption: "Panggung",
    alt: "Akbar Nawasunda dari belakang di jalan kota dengan lampu neon",
  },
];

export default function HomePage() {
  if (!featured) return null;
  const rest = catalogue.slice(1, 6);

  return (
    <>
      {/*
        One preload only, for the AVIF variant: browsers without AVIF ignore it and discover the
        WebP <source> in the parser. A second preload would download both files.
      */}
      <link
        rel="preload"
        as="image"
        type="image/avif"
        imageSrcSet={portraitSources.map((source) => `${source.avif} ${source.width}w`).join(", ")}
        imageSizes="(min-width: 1024px) 42vw, 92vw"
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

            <dl className={styles.stats}>
              <div className={styles.stat}>
                <dt className={styles.statLabel}>Tahun aktif</dt>
                <dd className={styles.statValue}>+{stats.yearsActive}</dd>
              </div>
              <div className={styles.stat}>
                <dt className={styles.statLabel}>Rilis terverifikasi</dt>
                <dd className={styles.statValue}>+{stats.releaseCount}</dd>
              </div>
              <div className={styles.stat}>
                <dt className={styles.statLabel}>Berbasis di</dt>
                <dd className={styles.statValueSmall}>{stats.base}</dd>
              </div>
            </dl>
          </div>

          <figure className={styles.visual}>
            <SignalField variant="dots" idPrefix="hero" size={600} className={styles.signal} />
            <div className={styles.portraitFrame}>
              <picture>
                <source
                  type="image/avif"
                  srcSet={portraitSources.map((source) => `${source.avif} ${source.width}w`).join(", ")}
                  sizes="(min-width: 1024px) 42vw, 92vw"
                />
                <source
                  type="image/webp"
                  srcSet={portraitSources.map((source) => `${source.webp} ${source.width}w`).join(", ")}
                  sizes="(min-width: 1024px) 42vw, 92vw"
                />
                <img
                  className={styles.portrait}
                  src={portraitSources[1].webp}
                  alt={portraitAlt}
                  width={portraitSize.width}
                  height={portraitSize.height}
                  decoding="async"
                />
              </picture>
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

          <ReleaseBento
            featured={featured}
            rest={rest}
            total={stats.releaseCount}
            since={siteConfig.since}
          />

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
          <VisualGrid items={visuals} />
          <p className={styles.footnote}>
            Empat aset resmi. Foto panggung dan video akan menyusul di halaman Visuals.
          </p>
        </Container>
      </section>
    </>
  );
}
