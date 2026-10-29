import Link from "next/link";

import { ReleaseLedger } from "@/components/content/ReleaseLedger";
import { ContentRequirement } from "@/components/content/ContentRequirement";
import { ReleaseCover } from "@/components/content/ReleaseCover";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/layout/Container";
import { PageMasthead } from "@/components/layout/PageMasthead";
import { coverArtwork, resolveCover, type CoverArtwork } from "@/content/covers";
import {
  assertLedgerComplete,
  ledgerRowFromDocument,
  ledgerRowFromRelease,
  type LedgerRow,
} from "@/content/release-ledger";
import { fromReleaseDocument, fromStaticRelease, type ReleaseView } from "@/content/release-view";
import { releases as staticReleases } from "@/content/releases";
import { pageMetadata } from "@/lib/metadata";
import { getPublishedReleases } from "@/studio/public";
import styles from "./music.module.css";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Music",
  description: "Rilis, remix, dan mix Akbar Nawasunda.",
  path: "/music",
});

/**
 * Published Studio releases take precedence. If none are published, the verified static list in
 * src/content/releases.ts is shown; if that is empty too, the honest "pending" notice shows.
 * Artwork is picked up from public/assets/covers/<slug>.* in both cases.
 *
 * Langkah 3n — the catalogue below the poster is a **ledger**, not a wall.
 *
 * The wall was nine sleeves in a four-column grid with a 3D tunnel under the pointer. It answered
 * "what does this catalogue look like"; a catalogue page has to answer "what is in it". The owner's
 * decision (3n, closing 3d) is the Discogs/Warp/Factory shape: one row per release, six columns —
 * ordinal, sleeve, title, type, year, streaming status — and the same fact-table language the
 * release page below it already uses.
 *
 * The takeover poster stays. It is not the wall: it is the one release that owns the moment, at
 * poster scale, and it is where the page's argument starts. The ledger under it is the whole
 * catalogue, all ten rows including the featured one — a numbered table that skips its own first
 * entry is a table nobody can trust, and round 26's de-duplication was about one *grid tile*
 * repeating the poster, not about the catalogue declining to list its newest record.
 */
export default async function MusicPage() {
  const published = await getPublishedReleases();
  const items: ReleaseView[] =
    published.length > 0
      ? published.map(({ slug, doc }) => fromReleaseDocument(slug, doc, resolveCover(slug)))
      : staticReleases.map((release) => fromStaticRelease(release, resolveCover(release.slug)));

  /*
   * The artwork is resolved here, on the server, because `coverArtwork` reads the filesystem: a
   * client component may not import that resolver. Same rule as before the ledger.
   */
  const resolved = new Map<string, CoverArtwork>();
  const artworkFor = (slug: string, coverUrl: string | null): CoverArtwork => {
    const cached = resolved.get(slug);
    if (cached) return cached;
    /* `coverArtwork` stats the filesystem, and the same slug is asked for by the ledger row and by
       the takeover poster. One lookup, one answer. */
    const artwork: CoverArtwork = coverUrl ? { kind: "image", src: coverUrl } : coverArtwork(slug);
    resolved.set(slug, artwork);
    return artwork;
  };

  /*
   * One row per release, in the owner's order, from whichever source is live. Both branches run
   * through `src/content/release-ledger.ts`, so the static fallback and the Studio records cannot
   * drift into two different table shapes.
   */
  const rows: LedgerRow[] =
    published.length > 0
      ? published.map(({ slug, doc }, index) =>
          ledgerRowFromDocument(slug, doc, artworkFor(slug, resolveCover(slug)), index),
        )
      : staticReleases.map((release, index) =>
          ledgerRowFromRelease(release, artworkFor(release.slug, resolveCover(release.slug)), index),
        );

  /* A numbered table that silently loses a row is worse than no table: the eye reads it as complete.
     The invariant is asserted where the data is assembled, and the same function is tested. */
  assertLedgerComplete(rows, items.length);

  const assets = items.map((item) => ({
    ...item,
    artwork: artworkFor(item.slug, item.coverUrl),
  }));
  const count = String(items.length).padStart(2, "0");
  /* The takeover needs a first release; `?? null` keeps noUncheckedIndexedAccess honest. */
  const lead = assets[0] ?? null;

  return (
    <>
      <PageMasthead
        index="Katalog"
        title="Musik"
        figure={items.length > 0 ? count : undefined}
        lead="Rilis, remix, dan mix Akbar Nawasunda."
        note={items.length > 0 ? `${count} rilis` : undefined}
      />

      {/*
        Round 22: the catalogue opens the way a major label's does — the release that owns the
        moment gets the screen first, at takeover scale, and the wall of ten reads as the body of
        work behind it instead of opening cold on a grid.
      */}
      {lead ? (
        <section className={styles.featured} aria-labelledby="featured-title">
          <Container>
            <div className={styles.featuredHead}>
              <p className={styles.featuredFlag}>Rilis unggulan</p>
              <h2 id="featured-title" className={styles.featuredTitle}>
                <Link href={lead.href}>{lead.title}</Link>
              </h2>
            </div>
            <div className={styles.featuredBody}>
              <Link
                className={styles.featuredSleeve}
                href={lead.href}
                aria-label={`Buka rilis ${lead.title}`}
              >
                <ReleaseCover artwork={lead.artwork} title={lead.title} showTitle={false} />
              </Link>
              <div className={styles.featuredCopy}>
                <p className={styles.featuredMeta}>{lead.meta}</p>
                <div className={styles.featuredActions}>
                  <ButtonLink href={lead.href} variant="primary">
                    Buka rilis
                  </ButtonLink>
                  <ButtonLink href="#katalog" variant="secondary">
                    Lihat katalog
                  </ButtonLink>
                </div>
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      <Container>
        <div className={styles.body} id="katalog">
        {items.length > 0 ? (
          <>
            <ReleaseLedger rows={rows} />
            <p className={styles.note}>
              {count} rilis · urut sesuai katalog
            </p>
          </>
        ) : (
          <div className={styles.empty}>
            <ContentRequirement
              title="Katalog menyusul"
              description="Daftar rilis resmi belum terbit."
              items={[]}
            />
          </div>
        )}
        </div>
      </Container>
    </>
  );
}
