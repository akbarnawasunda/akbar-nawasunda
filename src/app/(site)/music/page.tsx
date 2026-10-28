import Link from "next/link";

import { CatalogueWall, type WallItem } from "@/components/content/CatalogueWall";
import { ContentRequirement } from "@/components/content/ContentRequirement";
import { ReleaseCover } from "@/components/content/ReleaseCover";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/layout/Container";
import { PageMasthead } from "@/components/layout/PageMasthead";
import { coverArtwork, resolveCover } from "@/content/covers";
import { fromStaticRelease, type ReleaseView } from "@/content/release-view";
import { releases as staticReleases } from "@/content/releases";
import { pageMetadata } from "@/lib/metadata";
import styles from "./music.module.css";

export const dynamic = "force-static";

export const metadata = pageMetadata({
  title: "Music",
  description: "Rilis, remix, dan mix Akbar Nawasunda.",
  path: "/music",
});

/**
 * Static catalogue page using only the verified static releases from src/content/releases.ts.
 * Artwork is picked up from public/assets/covers/<slug>.*.
 */
export default function MusicPage() {
  const items: ReleaseView[] = staticReleases.map((release) =>
    fromStaticRelease(release, resolveCover(release.slug))
  );

  const wallItems: WallItem[] = items.map((item) => ({
    ...item,
    artwork: item.coverUrl ? { kind: "image", src: item.coverUrl } : coverArtwork(item.slug),
  }));
  const count = String(items.length).padStart(2, "0");
  const lead = wallItems[0] ?? null;
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
                    Lihat dinding
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
            <CatalogueWall items={wall} startIndex={lead ? 1 : 0} />
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