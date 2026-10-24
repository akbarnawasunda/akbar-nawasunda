import type { Metadata } from "next";

import {
  portraitAlt,
  portraitSize,
  portraitSources,
  stickerPortraitAlt,
  stickerPortraitSize,
  stickerPortraitSources,
} from "@/assets/web";
import { ReleaseBento } from "@/components/content/ReleaseBento";
import { SectionsView } from "@/components/content/SectionsView";
import { Container } from "@/components/layout/Container";
import { GenreTape } from "@/components/layout/GenreTape";
import { PlatformRow } from "@/components/layout/PlatformRow";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { VisualRail } from "@/components/media/VisualRail";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Magnetic } from "@/components/zine/Magnetic";
import { Reveal } from "@/components/zine/Reveal";
import { coverArtwork } from "@/content/covers";
import { fromStaticRelease } from "@/content/release-view";
import { releases } from "@/content/releases";
import { heroStats } from "@/content/stats";
import { visualItems } from "@/content/visuals";
import { artistFacts, artistTimeline } from "@/content/artist";
import { siteConfig } from "@/config/site";
import { contactEmail, contactHref, listenLinks, listenUrl, socialLinks } from "@/config/socials";
import { artistJsonLd, serializeJsonLd } from "@/lib/structured-data";
import { getPublicPage } from "@/studio/public";
import styles from "./page.module.css";

/**
 * Homepage — the "zine" pass (2026-10-23).
 *
 * What this page is: a printed object that happens to scroll. Tape, paper, a rubber stamp, a blue
 * spray slab behind the first letter, a sticker portrait cut out of its studio background and dropped
 * on top of the type. Every one of those is a flat colour, a 1px edge or a torn clip-path — there is
 * still no canvas, no shader, no particle field and no purple glow anywhere (D-055 stands).
 *
 * What carries it instead of effects:
 * - a real cut-out portrait at three widths, deliberately overflowing its column so the H1 and the
 *   artist overlap, which is the one compositional idea the references all share;
 * - the owner's own materials: tawny tape, off-white stock, a red stamp;
 * - type set tight (-0.03em) at a size that only fits because the layout is asymmetric.
 *
 * Copy rules are unchanged and non-negotiable: counts are derived (src/content/stats.ts), every
 * platform link comes from the owner's own files (14 of them, D-090), and anything the owner has not
 * confirmed is either absent or literally printed as [NEEDS OWNER]. No stream totals, no awards.
 */
export const metadata: Metadata = {
  title: {
    absolute: `${siteConfig.name} — Produser, Remixer, DJ asal Bandung Barat`,
  },
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

const youtube = socialLinks.find((link) => link.platform === "youtube");
const catalogue = releases.map((release) => ({
  ...fromStaticRelease(release, null),
  artwork: coverArtwork(release.slug),
}));
const featured = catalogue[0];
const stats = heroStats({ since: siteConfig.since, origin: siteConfig.origin });
/** How much of the catalogue is still missing a year or a listening link, counted not guessed. */
const missingYear = releases.filter((release) => !release.year).length;
const missingLink = releases.filter((release) => release.links.length === 0).length;
const officialLinkCount = listenLinks.length + socialLinks.length;

export default async function HomePage() {
  if (!featured) return null;
  const home = await getPublicPage("home");
  const homeSections = home?.sections.filter((section) => section.visible) ?? [];
  const rest = catalogue.slice(1, 6);
  const facts = artistFacts.slice(0, 4);
  const timeline = artistTimeline;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(artistJsonLd(`${siteConfig.url.replace(/\/$/, "")}/brand/an-mark.webp`)),
        }}
      />

      <link
        rel="preload"
        as="image"
        type="image/avif"
        imageSrcSet={stickerPortraitSources.map((source) => `${source.avif} ${source.width}w`).join(", ")}
        imageSizes="(min-width: 1024px) 46vw, 80vw"
        fetchPriority="high"
      />

      {/* ------------------------------------------------------------------ hero */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <span className={styles.heroGrid} aria-hidden="true" />
        <span className={styles.heroSpray} aria-hidden="true" />

        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={`tape ${styles.eyebrow}`}>
              {siteConfig.origin.replace(", Indonesia", "")} • Sejak {siteConfig.since} • +{stats.releaseCount} rilis
            </p>

            <h1 id="hero-title" className={styles.title}>
              <span className={styles.titleLine}>
                <span className={styles.blueSlab} aria-hidden="true" />
                <span className={styles.titleWord}>Akbar</span>
              </span>
              <span className={styles.titleLine}>
                <span className={styles.titleWord}>Nawasunda</span>
              </span>
            </h1>

            <p className={styles.sub}>
              Produser, remixer, dan DJ asal Bandung Barat. Breakbeat, Indo Bass, Jedag Jedug — musik
              yang dibuat dengan tangan, bukan template.
            </p>

            <div className={styles.actions}>
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

            {/* Every number is derived: years from siteConfig.since, releases from the verified
                catalogue, platforms from the four confirmed links. Nothing is typed by hand. */}
            <dl className={styles.stats}>
              <div className={styles.stat}>
                <dt>Rilis</dt>
                <dd>
                  <span className={styles.statValue}>+{stats.releaseCount}</span>
                  <span className={styles.statNote}>terverifikasi</span>
                </dd>
              </div>
              <div className={styles.stat}>
                <dt>Tahun aktif</dt>
                <dd>
                  <span className={styles.statValue}>+{stats.yearsActive}</span>
                  <span className={styles.statNote}>sejak {siteConfig.since}</span>
                </dd>
              </div>
              <div className={styles.stat}>
                <dt>Platform</dt>
                <dd>
                  <span className={styles.statValue}>{officialLinkCount}</span>
                  <span className={styles.statNote}>tautan resmi</span>
                </dd>
              </div>
            </dl>
          </div>

          <figure className={styles.sticker}>
            <span className={styles.stickerTape} aria-hidden="true" />
            <picture>
              <source
                type="image/avif"
                srcSet={stickerPortraitSources.map((source) => `${source.avif} ${source.width}w`).join(", ")}
                sizes="(min-width: 1024px) 46vw, 80vw"
              />
              <source
                type="image/webp"
                srcSet={stickerPortraitSources.map((source) => `${source.webp} ${source.width}w`).join(", ")}
                sizes="(min-width: 1024px) 46vw, 80vw"
              />
              <img
                className={styles.stickerImg}
                src={stickerPortraitSources[1].webp}
                alt={stickerPortraitAlt}
                width={stickerPortraitSize.width}
                height={stickerPortraitSize.height}
                fetchPriority="high"
                decoding="async"
              />
            </picture>
            <figcaption className={styles.stickerCaption}>
              Potret resmi — dipotong dari latar studio, file asli pemilik
            </figcaption>
          </figure>
        </div>

        <p className={styles.scrollCue} aria-hidden="true">
          <span>Gulir</span>
          <span className={styles.scrollLine} />
        </p>
      </section>

      {/* ------------------------------------------------------- manifesto strip */}
      <div className={styles.manifesto}>
        <Container>
          <div className={styles.manifestoInner}>
            <p className={`stamp ${styles.manifestoStamp}`}>
              Human made
              <br />
              no AI artwork
            </p>
            <p className={styles.manifestoText}>
              Semua foto di situs ini file asli pemilik, semua sampul rilis dibuat dari judul dan
              monogram. Tidak ada gambar hasil generate dan tidak ada angka yang dikarang.
            </p>
          </div>
        </Container>
      </div>

      <PlatformRow />
      <GenreTape />

      {/* ----------------------------------------------------------------- music */}
      <section className={styles.section} id="music" aria-labelledby="music-title">
        <Container>
          <SectionHeader
            eyebrow="01 — Katalog"
            title="Rilisan terbaru"
            id="music-title"
            action={{ href: "/music", label: "Semua rilis" }}
          />
          <Reveal>
            <ReleaseBento featured={featured} rest={rest} total={stats.releaseCount} />
          </Reveal>
          {missingYear > 0 || missingLink > 0 ? (
            <p className={styles.footnote}>
              {missingYear > 0 ? `${missingYear} rilis belum punya tahun` : null}
              {missingYear > 0 && missingLink > 0 ? " · " : null}
              {missingLink > 0 ? `${missingLink} rilis belum punya tautan dengar` : null}
              {" — sisanya lengkap. "}
              <span className={styles.needs}>[NEEDS OWNER]</span>
            </p>
          ) : null}
        </Container>
      </section>

      {/* --------------------------------------------------------------- visuals */}
      <section className={styles.section} id="visuals" aria-labelledby="visuals-title">
        <Container>
          <SectionHeader
            eyebrow="02 — Arsip"
            title="Enam aset, tanpa stok"
            id="visuals-title"
            action={youtube ? { href: youtube.href, label: "YouTube" } : undefined}
          />
        </Container>
        <VisualRail items={visualItems} />
      </section>

      {/* ------------------------------------------------------------- press kit */}
      <section className={styles.section} id="press" aria-labelledby="press-title">
        <Container>
          <div className={styles.pressWrap}>
            <div className={`paper ${styles.press}`}>
              <span className={styles.pressTape} aria-hidden="true" />
              <p className={styles.pressEyebrow}>03 — Press kit</p>
              <h2 id="press-title" className={styles.pressTitle}>
                Akbar Nawasunda
              </h2>
              <p className={styles.pressLead}>
                Produser dan DJ asal Bandung Barat. Aktif sejak {siteConfig.since} dengan nama
                panggung DJ Akbar Remix, sekarang tampil sebagai Akbar Nawasunda.
              </p>

              <ol className={styles.timeline}>
                {timeline.map((entry) => (
                  <li key={`${entry.marker}-${entry.title}`} className={entry.pending ? styles.pending : undefined}>
                    <span className={styles.timelineYear}>{entry.marker}</span>
                    <span className={styles.timelineBody}>
                      <span className={styles.timelineTitle}>
                        {entry.title}
                        {entry.pending ? <span className={styles.needs}> [NEEDS OWNER]</span> : null}
                      </span>
                      <span className={styles.timelineDetail}>{entry.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <dl className={styles.facts}>
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value ?? <span className={styles.needs}>[NEEDS OWNER]</span>}</dd>
                  </div>
                ))}
              </dl>
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
              <figcaption className={styles.pressPhotoCaption}>
                Untuk pers — unduh versi cetak di press kit
              </figcaption>
            </figure>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------------- epk */}
      <section className={styles.section} aria-labelledby="epk-title">
        <Container>
          <div className={styles.epk}>
            <div>
              <p className={styles.epkEyebrow}>04 — Booking &amp; pers</p>
              <h2 id="epk-title" className={styles.epkTitle}>
                Press kit siap unduh
              </h2>
              <p className={styles.epkText}>
                Bio singkat, fakta terverifikasi, potret resolusi cetak, monogram, dan lockup dalam
                satu arsip. Semua isinya file asli pemilik.
              </p>
              <div className={styles.epkActions}>
                <Magnetic>
                  <ButtonLink href="/epk/akbar-nawasunda-epk.zip" variant="primary">
                    Unduh EPK (.zip)
                  </ButtonLink>
                </Magnetic>
                <ButtonLink href="/epk" variant="secondary">
                  Lihat isi press kit
                </ButtonLink>
              </div>
            </div>
            <div className={styles.epkNote}>
              <p className={styles.epkNoteLabel}>Booking &amp; pers</p>
              <p className={styles.epkNoteValue}>
                <a href={contactHref}>{contactEmail}</a> — remix, kolaborasi, lisensi, dan materi
                pers.
              </p>
              <p className={styles.epkNoteLabel}>Formulir</p>
              <p className={styles.epkNoteValue}>
                Sengaja tidak ada. Satu alamat email yang dijawab lebih berguna daripada form tanpa
                tujuan.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {homeSections.length > 0 ? (
        <section className={styles.section} aria-labelledby="catatan-title">
          <Container>
            <SectionHeader eyebrow="05 — Catatan" title="Dari Studio" id="catatan-title" />
            <SectionsView sections={homeSections} />
          </Container>
        </section>
      ) : null}
    </>
  );
}
