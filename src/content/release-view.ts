/**
 * The presentation shape for one release, shared by the static catalogue and the Studio records.
 * Keeping the mapping here means cards and pages never contain content rules.
 */
import { RELEASE_TYPE_LABELS, publicReleaseDate, type ReleaseDocument } from "../studio/releases";
import { releaseDisplayTitle, releaseEyebrow, type Release } from "./releases";

export interface ReleaseView {
  slug: string;
  /** Display title, including the original artist when known. */
  title: string;
  /** Mono metadata line: type, verified year, era, or "Rilis". */
  meta: string;
  /** Public URL of 1:1 artwork, or null for the typographic card. */
  coverUrl: string | null;
  href: string;
  /** True when the entry is a published Studio record rather than the static fallback list. */
  managed: boolean;
}

export function fromStaticRelease(release: Release, coverUrl: string | null): ReleaseView {
  return {
    slug: release.slug,
    title: releaseDisplayTitle(release),
    meta: releaseEyebrow(release),
    coverUrl: release.cover ?? coverUrl,
    href: `/music/${release.slug}`,
    managed: false,
  };
}

export function fromReleaseDocument(slug: string, doc: ReleaseDocument, coverUrl: string | null): ReleaseView {
  const date = publicReleaseDate(doc);
  const meta = [RELEASE_TYPE_LABELS[doc.type], date].filter((part): part is string => Boolean(part)).join(" · ");
  return {
    slug,
    title: doc.title,
    meta: meta || "Rilis",
    coverUrl,
    href: `/music/${slug}`,
    managed: true,
  };
}
