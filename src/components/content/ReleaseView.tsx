import Image from "next/image";

import { getReleaseArtwork } from "@/studio/artwork";
import { RELEASE_TYPE_LABELS, publicReleaseDate, type ReleaseDocument } from "@/studio/releases";
import styles from "./content.module.css";

interface ReleaseViewProps {
  doc: ReleaseDocument;
  /** Studio preview: shows the date as it would be shown, and marks the page as a draft. */
  preview?: boolean;
  /**
   * Owner-uploaded 1:1 artwork from public/assets/covers/<slug>.* (see src/content/covers.ts).
   * Takes precedence over the manifest artwork id; the Studio preview passes none.
   */
  coverUrl?: string | null;
}

/** Shared view for a release. Used by the public release page and the Studio draft preview. */
export function ReleaseView({ doc, preview = false, coverUrl = null }: ReleaseViewProps) {
  const date = preview ? doc.releaseDate : publicReleaseDate(doc);
  const artwork = getReleaseArtwork(doc.artworkId);
  return (
    <article className={styles.release}>
      <p className={styles.eyebrow}>
        {RELEASE_TYPE_LABELS[doc.type]}
        {date ? ` · ${date}` : ""}
        {preview && doc.releaseDate && !doc.dateVerified ? " · date not verified (hidden publicly)" : ""}
      </p>
      <h1 className={styles.title}>{doc.title}</h1>
      {coverUrl ? (
        <figure className={styles.artwork}>
          {/* eslint-disable-next-line @next/next/no-img-element -- owner-uploaded 1:1 file, served as-is */}
          <img src={coverUrl} alt="" width={800} height={800} className={styles.artworkImage} />
        </figure>
      ) : artwork ? (
        <figure className={styles.artwork}>
          <Image src={artwork.image} alt={artwork.alt} sizes="(min-width: 720px) 420px, 90vw" unoptimized className={styles.artworkImage} />
        </figure>
      ) : null}
      {doc.description ? <p className={styles.paragraph}>{doc.description}</p> : null}
      {doc.links.length > 0 ? (
        <ul className={styles.releaseLinks}>
          {doc.links.map((link) => (
            <li key={link.href}>
              <a href={link.href} rel="noopener noreferrer" target="_blank">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
