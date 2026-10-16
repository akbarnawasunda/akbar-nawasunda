import Image from "next/image";
import Link from "next/link";

import { getImage } from "@/assets/manifest";
import { ReleaseCard } from "@/components/content/ReleaseCard";
import { Container } from "@/components/layout/Container";
import { releaseTypeLabel, releases as staticReleases } from "@/content/releases";
import { pageMetadata } from "@/lib/metadata";
import { RELEASE_TYPE_LABELS, publicReleaseDate } from "@/studio/releases";
import { getPublishedReleases } from "@/studio/public";
import styles from "./music.module.css";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Music",
  description: "Releases, remixes and mixes by Akbar Nawasunda.",
  path: "/music",
});

// Neutral stage background (approved, no people). Decorative only.
const stage = getImage("editorial-stage-bg");

/**
 * Music archive. Published releases from the Studio take precedence. If none are published, the
 * verified static list in src/content/releases.ts is shown. If both are empty, a quiet empty state
 * is shown. Drafts never appear here: getPublishedReleases only returns published rows.
 */
export default async function MusicPage() {
  const published = await getPublishedReleases();
  const useManaged = published.length > 0;
  const useStatic = !useManaged && staticReleases.length > 0;
  const total = useManaged ? published.length : useStatic ? staticReleases.length : 0;

  return (
    <>
      <section className={styles.header}>
        <Image
          src={stage}
          alt=""
          fill
          sizes="100vw"
          unoptimized
          className={styles.stage}
          priority
        />
        <Container className={styles.headerInner}>
          <p className={styles.eyebrow}>Catalogue</p>
          <h1 className={`${styles.title} page-title`}>Music</h1>
          {total > 0 ? (
            <p className={styles.count}>
              {total} {total === 1 ? "release" : "releases"}
            </p>
          ) : null}
        </Container>
      </section>

      <Container className={styles.body}>
        {useManaged ? (
          <ul className={styles.list} aria-label="Releases">
            {published.map(({ slug, doc }) => {
              const date = publicReleaseDate(doc);
              return (
                <li key={slug}>
                  <ReleaseCard
                    href={`/music/${slug}`}
                    typeLabel={RELEASE_TYPE_LABELS[doc.type]}
                    date={date ?? null}
                    title={doc.title}
                    artwork={null}
                  />
                </li>
              );
            })}
          </ul>
        ) : useStatic ? (
          <ul className={styles.list} aria-label="Releases">
            {staticReleases.map((release) => (
              <li key={release.slug}>
                <ReleaseCard
                  href={`/music/${release.slug}`}
                  typeLabel={releaseTypeLabel[release.type]}
                  date={String(release.year)}
                  title={release.title}
                  artwork={null}
                />
              </li>
            ))}
          </ul>
        ) : (
          <section className={styles.empty} aria-labelledby="releases-empty-title">
            <h2 id="releases-empty-title" className={styles.emptyTitle}>
              Releases
            </h2>
            <p className={styles.emptyText}>
              No releases are listed yet. Releases appear here as soon as they are published.
            </p>
            <Link href="/about" className="button">
              About the artist <span aria-hidden="true">→</span>
            </Link>
          </section>
        )}
      </Container>
    </>
  );
}
