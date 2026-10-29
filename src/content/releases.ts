/**
 * Music catalogue data model.
 *
 * Source of truth: the owner's own content files, handed over 2026-10-24
 * (`releases.json` + `artistPlatform.ts → releases` + `content.json → featured`). Titles, years,
 * formats and URLs are copied from that data — nothing here is composed by the site.
 *
 * Where the owner's two files disagree, the field is left empty rather than picked:
 * `dj-rantau-den-panjauah` is listed as "Remix" in one file and under "originals" in the other, so it
 * carries a year and a link but no `type`. Where a year is absent it stays absent, and every page
 * prints `[NEEDS OWNER]` instead of guessing.
 *
 * Order is the owner's list order, not chronological: the first six are the entries the site has
 * shipped since Phase 4, the four newer ones are appended. That is also the order the generated
 * sleeves are numbered in (`RILIS 01 / 10` …), so re-ordering renumbers the artwork.
 *
 * Phase 4 seeds the same entries into Turso through drizzle/seed.ts; this static list stays as the
 * fallback shown when no database is configured (preview, local dev).
 */

import { UNCLASSIFIED } from "./copy";

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
    type: "remix",
    year: 2025,
    links: [
      {
        label: "SoundCloud",
        href: "https://soundcloud.com/akbarnawasunda/masih-mencintainya-papinka-2025-akbar-nawasunda",
      },
    ],
  },
  { slug: "cinta-terbuang", title: "Cinta Terbuang", links: [] },
  {
    slug: "masih-dihatiku",
    title: "Masih Dihatiku",
    links: [{ label: "Apple Music", href: "https://music.apple.com/id/album/masih-dihatiku-single/1816312737" }],
  },
  { slug: "bayang-tanpa-kata", title: "Bayang Tanpa Kata", links: [] },
  {
    slug: "pada-imut-aisyah-tak-belagu",
    title: "Pada Imut Aisyah Tak Belagu",
    type: "single",
    year: 2025,
    links: [
      {
        label: "Apple Music",
        href: "https://music.apple.com/id/song/pada-imut-aisyah-tak-belagu/1868511241?l=id",
      },
    ],
  },
  {
    slug: "hitungan-cinta-breakbeat-super-exc",
    title: "Hitungan Cinta Breakbeat Super Exc",
    era: "DJ Akbar Remix",
    links: [],
  },
  {
    slug: "lali-dalane",
    title: "Lali Dalane",
    type: "single",
    year: 2024,
    links: [
      {
        label: "Spotify",
        href: "https://open.spotify.com/intl-id/album/3r5GTZnjOFsSfHx5YeANIS?si=9MJhKIkeRkmOBYMbtKP5wg",
      },
    ],
  },
  {
    slug: "dj-rantau-den-panjauah",
    title: "DJ Rantau Den Panjauah",
    year: 2024,
    links: [
      {
        label: "Spotify",
        href: "https://open.spotify.com/intl-id/track/32xyWKqnleBI5U56jvnGUa?si=b22bacdf3ab24e2e",
      },
    ],
  },
  {
    slug: "kamu-nanyeak",
    title: "Kamu Nanyeak",
    type: "single",
    year: 2025,
    links: [{ label: "Apple Music", href: "https://music.apple.com/id/song/kamu-nanyeak/1821914972?l=id" }],
  },
  {
    slug: "ngertenono-ati-medium-hall",
    title: "Ngertenono Ati Medium Hall",
    type: "remix",
    year: 2025,
    links: [
      {
        label: "SoundCloud",
        href: "https://soundcloud.com/akbarnawasunda/ngertenono_ati_medium_hall_mbfrecords",
      },
    ],
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
 * What is actually known about a release, e.g. "Remix · 2025", "Single · 2024" or "Era DJ Akbar Remix".
 *
 * Langkah 3i: the old fallback was the bare word "Rilis", which the catalogue printed where a type
 * belongs ("Cinta Terbuang / Rilis") and which the PRD counted as an empty value reaching the public.
 * It is now an explicit status — "Belum terklasifikasi" — so the line says what is missing instead of
 * looking like a type nobody has heard of.
 */
export function releaseEyebrow(release: Release): string {
  const parts = [
    release.type ? releaseTypeLabel[release.type] : null,
    release.year ? String(release.year) : null,
    release.era ? `Era ${release.era}` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" · ") : UNCLASSIFIED;
}

/** Title as displayed, including the original artist when known: "Masih Mencintainya — Papinka". */
export function releaseDisplayTitle(release: Release): string {
  return release.source ? `${release.title} — ${release.source}` : release.title;
}
