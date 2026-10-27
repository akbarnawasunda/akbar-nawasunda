import Link from "next/link";

import { CatalogueWall, type WallItem } from "@/components/content/CatalogueWall";
import { ContentRequirement } from "@/components/content/ContentRequirement";
import { ReleaseCover } from "@/components/content/ReleaseCover";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/layout/Container";
import { PageMasthead } from "@/components/layout/PageMasthead";
import { coverArtwork, resolveCover } from "@/content/covers";
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
 * The page head is a printed blue sleeve (R8, D-121) and the catalogue is a wall of sleeves you can
 * put your pointer through, instead of the three-column card grid it used to be. Two reasons:
 * a catalogue page's job is to make ten sleeves feel like a body of work, and a grid of bordered
 * tiles makes ten releases look like ten blog posts.
 */
export default async function MusicPage() {
  const published = await getPublishedReleases();
  const items: ReleaseView[] =
    published.length > 0
      ? published.map(({ slug, doc }) => fromReleaseDocument(slug, doc, resolveCover(slug)))
      : staticReleases.map((release) => fromStaticRelease(release, resolveCover(release.slug)));

  // The artwork is resolved here, on the server, and handed to the wall as a value.
  const wallItems: WallItem[] = items.map((item) => ({
    ...item,
    artwork: item.coverUrl ? { kind: "image", src: item.coverUrl } : coverArtwork(item.slug),
  }));
  const count = String(items.length).padStart(2, "0");
  /* The takeover needs a first release; `?? null` keeps noUncheckedIndexedAccess honest. */
  const lead = wallItems[0] ?? null;
  /*
   * Round 26, de-duplication: the lead release already owns the takeover poster above; printing it
   * again as the first cell of the wall made the page say the same thing twice. The wall is the
   * catalogue *after* the feature.
   */
  const wall = lead ? wallItems.slice(1) : wallItems;

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
                    Buka Rilis
                  </ButtonLink>
                  <ButtonLink href="#katalog" variant="secondary">
                    Lihat Dinding
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
            <CatalogueWall items={wall} />
            <p className={styles.note}>
              {count} rilis · sorot sampul untuk membuka
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
