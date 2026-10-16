import Link from "next/link";

import { ContentRequirement } from "@/components/content/ContentRequirement";
import { PageIntro } from "@/components/content/PageIntro";
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

/**
 * Published releases from the Studio take precedence. If none are published, the verified static
 * list in src/content/releases.ts is shown; if that is empty too, the honest "pending" notice shows.
 */
export default async function MusicPage() {
  const published = await getPublishedReleases();

  return (
    <Container>
      <PageIntro eyebrow="Catalogue" title="Music" />

      {published.length > 0 ? (
        <ul className={styles.list}>
          {published.map(({ slug, doc }) => {
            const date = publicReleaseDate(doc);
            return (
              <li key={slug}>
                <Link href={`/music/${slug}`} className={styles.item}>
                  <span className={styles.meta}>
                    {RELEASE_TYPE_LABELS[doc.type]}
                    {date ? ` · ${date}` : ""}
                  </span>
                  <span className={styles.name}>{doc.title}</span>
                  <span className={styles.cue} aria-hidden="true">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : staticReleases.length > 0 ? (
        <ul className={styles.list}>
          {staticReleases.map((release) => (
            <li key={release.slug}>
              <Link href={`/music/${release.slug}`} className={styles.item}>
                <span className={styles.meta}>
                  {releaseTypeLabel[release.type]} · {release.year}
                </span>
                <span className={styles.name}>{release.title}</span>
                <span className={styles.cue} aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ContentRequirement
          title="Releases"
          description="No releases are listed yet. Releases appear here as soon as they are published."
        />
      )}
    </Container>
  );
}
