import { CatalogueWall, type WallItem } from "@/components/content/CatalogueWall";
import { ContentRequirement } from "@/components/content/ContentRequirement";
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

  return (
    <>
      <PageMasthead
        index="01 — Katalog"
        title="Musik"
        figure={items.length > 0 ? count : undefined}
        lead="Rilis, remix, dan mix Akbar Nawasunda."
        note={items.length > 0 ? `${count} rilis` : undefined}
      />

      <Container>
        <div className={styles.body}>
        {items.length > 0 ? (
          <>
            <CatalogueWall items={wallItems} />
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
