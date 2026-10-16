import { getReleaseArtwork } from "@/studio/artwork";
import { RELEASE_TYPE_LABELS, publicReleaseDate, type ReleaseDocument } from "@/studio/releases";
import { ReleaseSleeve } from "./ReleaseSleeve";
import styles from "./content.module.css";

interface ReleaseViewProps {
  doc: ReleaseDocument;
  /** Studio preview: shows the date as it would be shown, and marks the page as a draft. */
  preview?: boolean;
}

/**
 * Shared view for a release. Used by the public release page and the Studio draft preview.
 * Artwork is shown only when it is approved for release artwork; otherwise a neutral sleeve is shown.
 */
export function ReleaseView({ doc, preview = false }: ReleaseViewProps) {
  const date = preview ? doc.releaseDate : publicReleaseDate(doc);
  const artwork = getReleaseArtwork(doc.artworkId);
  const typeLabel = RELEASE_TYPE_LABELS[doc.type];
  return (
    <article className={styles.release}>
      <div className={styles.releaseHead}>
        <div className={styles.releaseSleeve}>
          <ReleaseSleeve typeLabel={typeLabel} artwork={artwork} sizes="(min-width: 900px) 40vw, 80vw" />
        </div>

        <div className={styles.releaseInfo}>
          <p className={styles.eyebrow}>
            {typeLabel}
            {date ? ` · ${date}` : ""}
            {preview && doc.releaseDate && !doc.dateVerified ? " · date not verified (hidden publicly)" : ""}
          </p>
          <h1 className={`${styles.title} page-title`}>{doc.title}</h1>
          {doc.description ? <p className={styles.lead}>{doc.description}</p> : null}

          {doc.links.length > 0 ? (
            <ul className={styles.releaseLinkList} aria-label="Listen">
              {doc.links.map((link) => (
                <li key={link.href}>
                  <a className="button" href={link.href} rel="noopener noreferrer" target="_blank">
                    <span>{link.label}</span>
                    <span aria-hidden="true">↗</span>
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.notice}>Listening links for this release are not available yet.</p>
          )}
        </div>
      </div>
    </article>
  );
}
