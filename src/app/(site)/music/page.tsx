import { ContentRequirement } from "@/components/content/ContentRequirement";
import { PageIntro } from "@/components/content/PageIntro";
import { ReleaseGrid } from "@/components/content/ReleaseGrid";
import { Container } from "@/components/layout/Container";
import { resolveCover } from "@/content/covers";
import { fromReleaseDocument, fromStaticRelease, type ReleaseView } from "@/content/release-view";
import { releases as staticReleases } from "@/content/releases";
import { pageMetadata } from "@/lib/metadata";
import { getPublishedReleases } from "@/studio/public";

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
 */
export default async function MusicPage() {
  const published = await getPublishedReleases();

  const items: ReleaseView[] =
    published.length > 0
      ? published.map(({ slug, doc }) => fromReleaseDocument(slug, doc, resolveCover(slug)))
      : staticReleases.map((release) => fromStaticRelease(release, resolveCover(release.slug)));

  return (
    <Container>
      <PageIntro
        eyebrow="Katalog"
        title="Music"
        lead="Rilis, remix, dan mix Akbar Nawasunda. Tahun dan tautan per rilis menyusul."
      />

      {items.length > 0 ? (
        <ReleaseGrid items={items} />
      ) : (
        <ContentRequirement
          title="Katalog menyusul"
          description="Daftar rilis resmi belum terbit. Rilis tampil di sini setelah detailnya dikonfirmasi."
          items={[
            "Daftar rilis yang dikonfirmasi: judul, jenis, dan tahun",
            "Tautan streaming atau pembelian resmi per rilis",
            "Artwork yang izin pemakaiannya jelas",
          ]}
        />
      )}
    </Container>
  );
}
