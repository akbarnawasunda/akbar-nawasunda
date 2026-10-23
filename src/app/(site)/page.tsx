import type { Metadata } from "next";
import Link from "next/link";

import { portraitAlt, portraitSize, portraitSources, stageFrame } from "@/assets/web";
import { Container } from "@/components/layout/Container";
import { genres, siteConfig } from "@/config/site";
import { getSocialLink, listenUrl } from "@/config/socials";
import { releaseDisplayTitle, releaseEyebrow, releases } from "@/content/releases";
import styles from "./page.module.css";

/**
 * Homepage prototype (Phase 2). Static by intention: no CMS read on this route while the visual
 * direction is being reviewed. Hero copy uses only verified facts; release titles come from
 * src/content/releases.ts, which holds the verified list.
 */
export const metadata: Metadata = {
  title: {
    absolute: `${siteConfig.name} — Produser, Remixer, DJ asal Bandung Barat`,
  },
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

const youtube = getSocialLink("youtube");

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
              <a className={styles.primary} href={listenUrl} target="_blank" rel="noopener noreferrer">
                Dengar Sekarang
                <span aria-hidden="true">↗</span>
              </a>
              <a className={styles.secondary} href="#visuals">
                Lihat Visuals
              </a>
            </div>
          </div>

          <figure className={styles.portraitWrap}>
            {/* Liquid Signal placeholder (Phase 7 replaces this with the real WebGL scene).
                Sits at z-index -1 behind the portrait, 600x600, breathing 1 → 1.03 over 6s. */}
            <div className={styles.signalCanvas} aria-hidden="true" />
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
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>01 — Katalog</p>
              <h2 id="music-title" className={styles.sectionTitle}>
                Rilis terpilih
              </h2>
            </div>
            <Link href="/music" className={styles.sectionLink}>
              Semua rilis <span aria-hidden="true">→</span>
            </Link>
          </div>

          <ol className={styles.grid}>
            {releases.map((release, index) => (
              <li key={release.slug}>
                <Link href={`/music/${release.slug}`} className={styles.card}>
                  <span className={styles.cardTop}>
                    <span className={styles.cardIndex}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.cardArrow} aria-hidden="true">
                      ↗
                    </span>
                  </span>
                  <span className={styles.cardBody}>
                    <span className={styles.cardTitle}>{releaseDisplayTitle(release)}</span>
                    <span className={styles.cardMeta}>{releaseEyebrow(release)}</span>
                  </span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/music" className={`${styles.card} ${styles.cardIndexTile}`}>
                <span className={styles.cardTop}>
                  <span className={styles.cardIndex}>06</span>
                  <span className={styles.cardArrow} aria-hidden="true">
                    →
                  </span>
                </span>
                <span className={styles.cardBody}>
                  <span className={styles.cardTitle}>Semua rilis</span>
                  <span className={styles.cardMeta}>Buka katalog</span>
                </span>
              </Link>
            </li>
          </ol>

          <p className={styles.footnote}>
            Tahun rilis, artwork, dan tautan platform per rilis belum dikonfirmasi.{" "}
            <span className={styles.placeholder}>[NEEDS OWNER: data rilis 2–5]</span>
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
              <a
                className={styles.secondary}
                href={youtube.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                Buka YouTube
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
