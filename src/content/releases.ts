/**
 * Music catalogue data model.
 *
 * Only releases listed as VERIFIED in AGENTS.md / docs/01-BRAND-IDENTITY/FACTS_AND_VERIFICATION.md
 * appear here. `type`, `year` and `links` stay optional on purpose: for most titles the owner has
 * not confirmed a release year or a per-release streaming URL, and the site must not guess. Use
 * releaseEyebrow() to render whatever is actually known.
 *
 * Phase 4 replaces this static list with the published Studio records stored in Turso.
 */

export type ReleaseType = "single" | "ep" | "album" | "remix" | "mix";

export interface ReleaseLink {
  label: string;
  /** Official URL only (streaming, purchase or label page). */
  href: string;
}

export interface Release {
  /** URL segment under /music. Must be unique and URL-safe. */
  slug: string;
  title: string;
  /** Original artist, when the release is an interpretation of their song. */
  source?: string;
  type?: ReleaseType;
  year?: number;
  description?: string;
  links: readonly ReleaseLink[];
}

export const releases: readonly Release[] = [
  {
    slug: "masih-mencintainya-papinka",
    title: "Masih Mencintainya",
    source: "Papinka",
    year: 2025,
    links: [],
  },
  { slug: "cinta-terbuang", title: "Cinta Terbuang", links: [] },
  { slug: "masih-dihatiku", title: "Masih Dihatiku", links: [] },
  { slug: "bayang-tanpa-kata", title: "Bayang Tanpa Kata", links: [] },
  { slug: "pada-imut-aisyah-tak-belagu", title: "Pada Imut Aisyah Tak Belagu", links: [] },
];

export function getReleaseBySlug(slug: string): Release | undefined {
  return releases.find((release) => release.slug === slug);
}

export const releaseTypeLabel: Record<ReleaseType, string> = {
  single: "Single",
  ep: "EP",
  album: "Album",
  remix: "Remix",
  mix: "Mix",
};

/**
 * What is actually known about a release, e.g. "2025" or "Remix · 2025". Returns "Rilis" when the
 * owner has not confirmed a type or year yet — never an invented value.
 */
export function releaseEyebrow(release: Release): string {
  const parts = [
    release.type ? releaseTypeLabel[release.type] : null,
    release.year ? String(release.year) : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" · ") : "Rilis";
}

/** Title as displayed, including the original artist when known: "Masih Mencintainya — Papinka". */
export function releaseDisplayTitle(release: Release): string {
  return release.source ? `${release.title} — ${release.source}` : release.title;
}
