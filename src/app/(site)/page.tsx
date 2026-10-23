import type { Metadata } from "next";

import { portraitAlt, portraitSize, portraitSources, stageFrame } from "@/assets/web";
import { ReleaseGrid } from "@/components/content/ReleaseGrid";
import { SignalField } from "@/components/effects/SignalField";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { resolveCover } from "@/content/covers";
import { fromStaticRelease } from "@/content/release-view";
import { releases } from "@/content/releases";
import { genres, siteConfig } from "@/config/site";
import { getSocialLink, listenUrl } from "@/config/socials";
import styles from "./page.module.css";

/**
 * Homepage prototype (Phase 2, approved 2026-10-23 with notes).
 *
 * Static by intention: no CMS read on this route while the visual direction is being reviewed.
 * Copy uses only verified facts; the catalogue comes from src/content/releases.ts and picks up
 * artwork automatically once files are dropped into public/assets/covers/.
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

export default function HomePage() {
  return (
    <>
      {/*
        One preload only, for the AVIF variant: browsers that do not support it ignore this link and
        discover the WebP <source> in the parser. A second, WebP preload would be downloaded too.
      */}
      <link
        rel="preload"
        as="image"
        type="image/avif"
        imageSrcSet={portraitSources.map((source) => `${source.avif} ${source.width}w`).join(", ")}
        imageSizes="(min-width: 900px) 46vw, 92vw"
      />

      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroInner}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowRule} aria-hidden="true" />
              {siteConfig.origin.toUpperCase()} • SINCE {siteConfig.since}
            </p>

            <h1 id="hero-title" className={styles.title}>
              <span>Akbar</span>{" "}
              <span>Nawasunda</span>
            </h1>

            <p className={styles.lede}>
              Produser, remixer, dan DJ asal Bandung Barat. Breakbeat dan Indo Bass sejak 2020.
            </p>

            <div className={styles.actions}>
              <ButtonLink href={listenUrl} variant="primary" external>
                Dengar Sekarang
              </ButtonLink>
              <ButtonLink href="#visuals" variant="secondary">
                Lihat Visuals
              </ButtonLink>
            </div>
          </div>

          <figure className={styles.portraitWrap}>
            <SignalField />
            <div className={styles.portraitFrame}>
              <picture>
                <source
                  type="image/avif"
                  srcSet={portraitSources.map((source) => `${source.avif} ${source.width}w`).join(", ")}
                  sizes="(min-width: 900px) 46vw, 92vw"
                />
                <source
                  type="image/webp"
                  srcSet={portraitSources.map((source) => `${source.webp} ${source.width}w`).join(", ")}
                  sizes="(min-width: 900px) 46vw, 92vw"
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
            <figcaption className={styles.portraitCaption}>
              <span aria-hidden="true" />
              Potret resmi
            </figcaption>
          </figure>
        </div>

        <ul className={styles.genreBar} aria-label="Genre">
          {genres.map((genre) => (
            <li key={genre}>{genre}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section} id="music" aria-labelledby="music-title">
        <Container>
          <SectionHeader
            eyebrow="01 — Katalog"
            title="Rilis terpilih"
            id="music-title"
            action={{ href: "/music", label: "Semua rilis" }}
          />

          <ReleaseGrid items={catalogue} limit={6} />

          <p className={styles.footnote}>
            Tahun rilis, artwork, dan tautan platform per rilis belum dikonfirmasi.{" "}
            <span className={styles.placeholder}>[NEEDS OWNER: data rilis]</span>
          </p>
        </Container>
      </section>

      <section className={styles.section} id="visuals" aria-labelledby="visuals-title">
        <Container>
          <div className={styles.editorial}>
            <figure className={styles.stageFrame}>
              <span className={styles.frameLabel} aria-hidden="true">
                Arsip visual
              </span>
              <picture>
                <source type="image/avif" srcSet={stageFrame.avif} />
                <source type="image/webp" srcSet={stageFrame.webp} />
                <img
                  src={stageFrame.webp}
                  alt=""
                  width={stageFrame.width}
                  height={stageFrame.height}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
            </figure>

            <div className={styles.editorialCopy}>
              <p className={styles.eyebrow}>02 — Visual</p>
              <h2 id="visuals-title" className={styles.sectionTitle}>
                Visual sedang disiapkan
              </h2>
              <p className={styles.paragraph}>
                Foto panggung dan video resmi akan tampil di sini. Sementara ini, dokumentasi
                visual terbaru ada di kanal YouTube resmi.
              </p>
              <ButtonLink href={youtube.href} variant="secondary" external>
                Buka YouTube
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
