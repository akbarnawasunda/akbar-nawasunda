import Link from "next/link";

import type { PageSection } from "@/studio/content-model";
import { RELEASE_TYPE_LABELS, publicReleaseDate, type ReleaseKind } from "@/studio/releases";
import type { PublishedRelease } from "@/studio/public";
import styles from "./content.module.css";

interface SectionsViewProps {
  sections: PageSection[];
  /** Published releases for "music-list" sections. Empty when none are published. */
  releases?: PublishedRelease[];
}

/**
 * Renders managed sections. Hidden sections are skipped here, so the same renderer is safe for both
 * the public site and the Studio preview (the preview labels hidden sections separately).
 */
export function SectionsView({ sections, releases = [] }: SectionsViewProps) {
  const visible = sections.filter((section) => section.visible);
  return (
    <div className={styles.body}>
      {visible.map((section) => {
        if (section.type === "heading") {
          return <h2 key={section.id} className={styles.sectionHeading}>{section.text}</h2>;
        }
        if (section.type === "paragraph") {
          return <p key={section.id} className={styles.paragraph}>{section.text}</p>;
        }
        if (section.type === "music-list") {
          const items = releases.slice(0, section.count);
          if (items.length === 0) return null;
          return (
            <section key={section.id} aria-label={section.heading || "Music"} className={styles.musicBlock}>
              {section.heading ? <h2 className={styles.sectionHeading}>{section.heading}</h2> : null}
              <ul className={styles.releaseList}>
                {items.map((item) => {
                  const date = publicReleaseDate(item.doc);
                  return (
                    <li key={item.slug}>
                      <Link href={`/music/${item.slug}`} className={styles.releaseLink}>
                        <span className={styles.releaseMeta}>
                          {RELEASE_TYPE_LABELS[item.doc.type as ReleaseKind]}{date ? ` · ${date}` : ""}
                        </span>
                        <span>{item.doc.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        }
        return null;
      })}
    </div>
  );
}
