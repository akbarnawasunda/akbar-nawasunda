import Link from "next/link";

import { ContentRequirement } from "@/components/content/ContentRequirement";
import { PageIntro } from "@/components/content/PageIntro";
import { Container } from "@/components/layout/Container";
import { releaseTypeLabel, releases } from "@/content/releases";
import { pageMetadata } from "@/lib/metadata";
import styles from "./music.module.css";

export const metadata = pageMetadata({
  title: "Music",
  description: "Releases, remixes and mixes by Akbar Nawasunda.",
  path: "/music",
});

export default function MusicPage() {
  return (
    <Container>
      <PageIntro eyebrow="Catalogue" title="Music" />

      {releases.length === 0 ? (
        <ContentRequirement
          title="Catalogue pending"
          description="The official release list is not published yet. Releases appear here once their details are confirmed."
          items={[
            "Confirmed list of releases, with titles, types and release years",
            "Official streaming or purchase link for each release",
            "Artwork cleared for use on this website",
          ]}
        />
      ) : (
        <ul className={styles.list}>
          {releases.map((release) => (
            <li key={release.slug}>
              <Link href={`/music/${release.slug}`} className={styles.item}>
                <span className={styles.meta}>
                  {releaseTypeLabel[release.type]} · {release.year}
                </span>
                <span className={styles.name}>{release.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
