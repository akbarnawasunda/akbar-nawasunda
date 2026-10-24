import { ContentRequirement } from "@/components/content/ContentRequirement";
import { ReleaseGrid } from "@/components/content/ReleaseGrid";
import { Container } from "@/components/layout/Container";
import { resolveCover } from "@/content/covers";
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
 */
export default async function MusicPage() {
  const published = await getPublishedReleases();
  // Counted, not asserted: the catalogue is partly filled, and the page says how much.
  const missingYear = staticReleases.filter((release) => !release.year).length;
  const missingLink = staticReleases.filter((release) => release.links.length === 0).length;

  const items: ReleaseView[] =
    published.length > 0
      ? published.map(({ slug, doc }) => fromReleaseDocument(slug, doc, resolveCover(slug)))
      : staticReleases.map((release) => fromStaticRelease(release, resolveCover(release.slug)));

  return (
    <Container>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>01 — Katalog</p>
          <h1 className={styles.title}>Music</h1>
          <p className={styles.lead}>
            Rilis, remix, dan mix Akbar Nawasunda. Tahun dan tautan per rilis terisi bila pemilik
            katalog sudah mengonfirmasinya.
          </p>
        </div>
        {items.length > 0 ? (
          <p className={styles.count}>{String(items.length).padStart(2, "0")} rilis terverifikasi</p>
        ) : null}
      </header>

      {items.length > 0 ? (
        <>
          <ReleaseGrid items={items} />
          <p className={styles.note}>
            {missingYear > 0 ? `${missingYear} rilis belum bertahun` : "Semua rilis bertahun"}
            {" · "}
            {missingLink > 0
              ? `${missingLink} rilis belum punya tautan dengar`
              : "Semua rilis punya tautan dengar"}
            {" — sisanya menunggu pemilik katalog. "}
            <span className={styles.placeholder}>[NEEDS OWNER]</span>
          </p>
        </>
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
