import type { Metadata } from "next";
import Link from "next/link";

import { editorialFrame, portraitAlt, portraitSize, portraitSources } from "@/assets/web";
import { CatalogueIndex } from "@/components/content/CatalogueIndex";
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
import { artistFacts, artistTimeline } from "@/content/artist";
import { siteConfig } from "@/config/site";
import { contactEmail, contactHref, listenLinks, listenUrl, socialLinks } from "@/config/socials";
import { brandCard } from "@/lib/social-card";
import { artistJsonLd, serializeJsonLd } from "@/lib/structured-data";
import { getPublicPage } from "@/studio/public";

import { Registration } from "@/components/print/Registration";

import styles from "./page.module.css";

/**
 * Homepage — "frekuensi" (round 7, D-119).
 *
 * The three passes before this one were all corrections of the same object: a zine, then an
 * editorial page, then the same editorial page with the radius turned down. Every one of them was
 * built out of *cards* — a border, a radius, some padding, a mono label — and a page made of cards
 * is a page that looks like a dashboard no matter how good the typography inside the cards is.
 * martingarrix.com and alanwalker.com are not built out of cards. They are built out of **one big
 * image, one enormous name, and a handful of things you can actually do.**
 *
 * So this page is composed as five full-width bands, and each band is one idea:
 *
 *   1. the hero — a real photograph of an empty stage, the name at 15vw, and the facts;
 *   2. the running head — the catalogue printed as one line of display type that scrubs with scroll;
 *   3. the transmission — the newest release as a spread: sleeve at half the screen, type large;
 *   4. the index — all ten releases as rows, inverting to paper under the cursor;
 *   5. the bands — the street frame, the about sheet, the archive, the monogram, the deck, the press.
 *
 * What is deliberately missing: three "stat cards" (a number is not a card), any pill-shaped CTA,
 * any rounded panel, and any decoration that does not carry information. The accent rule is
 * unchanged from D-108: the signal blue is a full stop, an active rule, a drawn timeline and a link
 * underline. Nothing else.
 *
 * Copy rules are unchanged and non-negotiable: counts are derived (src/content/stats.ts), every
 * platform link comes from the owner's own files (D-090), and anything unconfirmed is absent or
 * printed as [NEEDS OWNER]. No stream totals, no awards, no tour dates — there are none to show.
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
const missingYear = releases.filter((release) => !release.year).length;
const missingLink = releases.filter((release) => release.links.length === 0).length;
const officialLinkCount = listenLinks.length + socialLinks.length;

/** One sleeve path per release, for the index preview. `release.cover` first, then the waterfall. */
const indexRows = catalogue.map((item, index) => ({
  slug: item.slug,
  ordinal: String(index + 1).padStart(2, "0"),
  href: item.href,
  title: item.title,
  meta: item.meta,
  sleeve: item.artwork.kind === "generated" ? null : item.artwork.src,
}));

const tickerItems = catalogue.map((item) => ({
  slug: item.slug,
  title: item.title,
  meta: item.meta,
}));

export default async function HomePage() {
  if (!featured) return null;
  const home = await getPublicPage("home");
  const homeSections = home?.sections.filter((section) => section.visible) ?? [];
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

      {/* The hero image is the LCP element: preloaded, fetched at high priority, never lazy. */}
      <link
        rel="preload"
        as="image"
        type="image/avif"
        href={editorialFrame.webp}
        fetchPriority="high"
      />

      {/* ------------------------------------------------------------------ hero */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <Registration tone="ink" code="lembar 1 dari 2 · cetak ganda" />
        {/*
          The photograph: the owner's own frame of an empty stage under one warm lamp. It is the
          only landscape image in the archive, and it does something no graphic could — it puts the
          artist in a room. Depth gives it a slow counter-move so the type and the room separate.
        */}
        <Depth className={styles.heroMedia} y={-70} scale={0.05} perspective={1400} data-layer="hero-photo">
          {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed art direction, exact crop */}
          <img
            className={styles.heroImage}
            src={editorialFrame.webp}
            alt=""
            width={editorialFrame.width}
            height={editorialFrame.height}
            fetchPriority="high"
            decoding="async"
          />
        </Depth>
        <div className={styles.heroScrim} aria-hidden="true" />

        {/*
          The hero is a room with a printed sheet held in it.

          Flatness here had one cause: every layer of the type block sat at `translateZ(0)` and slid
          by a different multiple of the pointer. Five flat pictures at five speeds is parallax — it
          is honest about the pointer, but it says nothing about space, and that is what the owner
          saw.

          The obvious repair — a Z per layer — was built, measured and rejected. A layer at −110 px
          lost 48 px at each end of the masthead rule and dropped the facts bar 25 px inside the
          paragraph above it; a layer at +55 px pushed the name's box outside the frame on a 320 px
          screen. Both are layout failures, and both are written up in `page.module.css` under
          `--depth-sheet` along with the numbers.

          So the depth is carried by the object instead of by the layers: the whole type block is
          one rigid sheet 40 px behind the glass, and the plate turns that sheet while the
          photograph behind it holds still. That is the cue that reads — one surface leaning towards
          you, foreshortened, inside a room that does not lean. Nothing on the sheet can move
          relative to anything else on it, so the rule, the name and the facts stay in register at
          every angle, and the sheet's own turn is the only thing that moves.

          2° of yaw and 0.5° of pitch — a glance, not a turn.

          The previous pass ran 6.2°/0.8° and the owner's note was that it made him queasy: at that
          angle the hero stops being a printed sheet and becomes a tilting panel, and a full-width
          block of 14vw type swinging under the cursor is nausea, not depth. The correction is not
          "a bit less" but a different gesture — the sheet should read as *leaning into the room*
          just enough that the photograph behind it stops looking pasted on.

          At 2° the whole surface still foreshortens as one plane, the photo still holds still, and
          the ink plate still moves at the corner, but nobody will describe the motion before they
          describe the page. The depth that remains legible is carried by the sheet's own −40 px of
          Z and the scroll drift between the two planes, which cost nothing and never make anyone
          motion-sick.
        */}
        <Plate3D
          className={styles.heroStage}
          data-plate="hero-stage"
          tiltY={2}
          tiltX={0.5}
          shift={6}
          perspective={1300}
        >
        <div className={styles.heroInner}>
        {/*
          The masthead: two mono lines at the top corners, the way a magazine runs its issue
          information. It costs 20 px of height and it stops the top third of the hero from being
          empty dark — a full-bleed photograph needs something set on it at the edges or the eye has
          nowhere to start.
        */}
        <div className={styles.masthead} data-depth="hero-masthead">
          <p className={styles.kicker}>
            <span className={styles.live} aria-hidden="true" />
            {siteConfig.origin.replace(", Indonesia", "")} · sejak {siteConfig.since}
          </p>
          <p className={styles.kicker}>Produser · Remixer · DJ</p>
        </div>

        {/* The type layer. It drifts against the photograph, so the room and the name read as two
            depths rather than one picture sliding. */}
        <Depth className={styles.heroText} y={-26} data-layer="hero-type">
        <div className={styles.heroBody}>

          <h1 id="hero-title" className={`${styles.name} ink`} data-depth="hero-name">
            <span className={styles.nameLine}>Akbar</span>
            <span className={`${styles.nameLine} ${styles.nameItalic}`}>
              Nawasunda<span className={styles.stop} aria-hidden="true">.</span>
            </span>
          </h1>

          <div className={styles.heroFoot} data-depth="hero-foot">
            <p className={styles.heroSub}>
              Produser, remixer, dan DJ asal Bandung Barat. Breakbeat, Indo Bass, Jedag Jedug — tiga
              bahasa yang dipakai bergantian dalam satu set, direkam di studio rumah.
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

        {/* The facts, as one ruled line: a figure, a label, a figure — not three cards. */}
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
        <p className={styles.factNote}>
          Semua angka dihitung dari katalog dan berkas pemilik. Tidak ada statistik platform.
        </p>
        </div>

        <p className={styles.cue} aria-hidden="true" data-depth="hero-cue">
          <span>Gulir</span>
          <span className={styles.cueLine} />
        </p>

        </div>
        </Plate3D>
      </section>

      {/* ----------------------------------------------------------- running head */}
      <ReleaseTicker items={tickerItems} />

      {/* ------------------------------------------------------------- transmission */}
      <section className={styles.transmission} id="music" aria-labelledby="music-title">
        <Container>
          <div className={styles.transmissionHead}>
            <p className={styles.sectionNumber}>01 — Rilis terbaru</p>
            <Link className={styles.sectionLink} href="/music">
              Semua rilis <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className={styles.transmissionBody}>
            <div className={styles.transmissionCopy}>
              <h2 id="music-title" className={styles.transmissionTitle}>
                {featured.title}
              </h2>
              <p className={styles.transmissionMeta}>{featured.meta}</p>
              <p className={styles.transmissionText}>
                Rilis terbaru di katalog. Sampul, tahun, dan tautan dengar diambil dari berkas
                pemilik — bukan dari basis data platform.
              </p>
              <div className={styles.transmissionActions}>
                <Magnetic>
                  <ButtonLink href={featured.href} variant="primary">
                    Buka rilis
                  </ButtonLink>
                </Magnetic>
                <span className={styles.transmissionCount}>
                  {String(stats.releaseCount).padStart(2, "0")} rilis terverifikasi
                </span>
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
              <p className={styles.sleeveCaption}>
                {featured.artwork.kind === "image" ? "Artwork asli" : "Sampul edisi situs"}
              </p>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------------ index */}
      <section className={styles.indexBand} aria-labelledby="catalogue-title">
        <Container>
          <div className={styles.transmissionHead}>
            <p className={styles.sectionNumber}>02 — Katalog</p>
            <p className={styles.sectionNote}>Sepuluh rilis · urut berkas pemilik</p>
          </div>
          <h2 id="catalogue-title" className={`${styles.indexTitle} ink`}>
            Indeks
          </h2>
          <CatalogueIndex rows={indexRows} />
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

      {/* ------------------------------------------------------------------- night */}
      {/*
        A full-bleed band on the owner's own night-street frame. The quote is the artist's sentence
        from the biography, verbatim — the three genres are what he says he plays, not a claim the
        site made up. This is the one place on the page with no interface on it at all: a reader
        scrolls past a photograph and a sentence, which is what an artist site should feel like.
      */}
      <section className={styles.night} aria-label="Malam">
        <Depth className={styles.nightMedia} y={-90} perspective={1200}>
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative full-bleed frame */}
          <img
            src="/media/stage-700.webp"
            alt=""
            width={700}
            height={700}
            loading="lazy"
            decoding="async"
            className={styles.nightImage}
          />
        </Depth>
        {/* One flat sheet of the identity blue over a desaturated frame: the photograph becomes a
            print of the room rather than a stock night shot. No blend mode — a plain opacity step,
            because a blend mode on a full-bleed photo forces a repaint of the whole band. */}
        <span className={styles.nightTint} aria-hidden="true" />
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
              eyebrow="03 — Arsip"
              title="Enam aset, tanpa stok"
              id="visuals-title"
              align="end"
              action={youtube ? { href: youtube.href, label: "YouTube" } : undefined}
            />
          </Depth>
        </Container>
        <VisualRail items={visualItems} />
      </section>

      {/* --------------------------------------------------------------- monogram */}
      <section className={styles.signature} aria-labelledby="signature-title">
        <AnMonogram />
        <div className={styles.signatureInner}>
          <p className={styles.sectionNumber}>04 — Monogram</p>
          <h2 id="signature-title" className={styles.signatureTitle}>
            Tanda <span className={styles.signatureAccent}>AN</span>
          </h2>
          <p className={styles.signatureNote}>
            Bentuk tiga dimensi dari penanda milik pemilik sendiri: satu huruf A dan satu huruf N
            yang bertumpuk jadi satu garis. Dirender di peramban, bukan gambar tempelan.
          </p>
          <p className={styles.signatureMeta}>Bandung Barat, Jawa Barat · sejak {siteConfig.since}</p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ press */}
      <section className={styles.pressBand} id="press" aria-labelledby="press-title">
        <Container>
          <div className={styles.pressWrap}>
            <div className={`paper ${styles.press}`}>
              <p className={styles.pressEyebrow}>05 — Press kit</p>
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

              <dl className={styles.factSheet}>
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

      {/* -------------------------------------------------------------------- epk */}
      <section className={styles.epkBand} aria-labelledby="epk-title">
        <Container>
          <div className={styles.epk}>
            <div>
              <p className={styles.sectionNumber}>06 — Booking &amp; pers</p>
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
        <section className={styles.notesBand} aria-labelledby="catatan-title">
          <Container>
            <SectionHeader eyebrow="07 — Catatan" title="Dari Studio" id="catatan-title" />
            <SectionsView sections={homeSections} />
          </Container>
        </section>
      ) : null}
    </>
  );
}
