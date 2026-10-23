/**
 * Music catalogue data model.
 *
 * Only releases listed as VERIFIED in AGENTS.md appear here. `type`, `year` and `links` stay
 * optional on purpose: the owner confirmed the titles but not the years or per-release streaming
 * URLs, and the site must not guess. Use releaseEyebrow() to render whatever is actually known.
 *
 * Phase 4 seeds the same verified entries into Turso through drizzle/seed.ts; this static list stays
 * as the fallback shown when no database is configured (preview, local dev).
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
  /** Chapter of the artist's history, e.g. "DJ Akbar Remix". Presented as evolution, not a second act. */
  era?: string;
  type?: ReleaseType;
  year?: number;
  description?: string;
  links: readonly ReleaseLink[];
  /**
   * Optional artwork path. Leave undefined and the site looks for
   * /assets/covers/<slug>.(webp|avif|jpg|jpeg|png) — see src/content/covers.ts.
   */
  cover?: string | null;
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
  {
    slug: "hitungan-cinta-breakbeat-super-exc",
    title: "Hitungan Cinta Breakbeat Super Exc",
    era: "DJ Akbar Remix",
    links: [],
  },
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
 * What is actually known about a release, e.g. "2025", "Remix · 2025" or "Era DJ Akbar Remix".
 * Returns "Rilis" when neither a type, year nor era is known — never an invented value.
 */
export function releaseEyebrow(release: Release): string {
  const parts = [
    release.type ? releaseTypeLabel[release.type] : null,
    release.year ? String(release.year) : null,
    release.era ? `Era ${release.era}` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" · ") : "Rilis";
}

/** Title as displayed, including the original artist when known: "Masih Mencintainya — Papinka". */
export function releaseDisplayTitle(release: Release): string {
  return release.source ? `${release.title} — ${release.source}` : release.title;
}
