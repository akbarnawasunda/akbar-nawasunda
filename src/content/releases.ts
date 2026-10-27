/**
 * Music catalogue data model — the permanent single source of truth for what the artist has released.
 *
 * Round 35: reconciled against MusicBrainz. The owner's handover files (2026-10-24:
 * `releases.json` + `artistPlatform.ts → releases` + `content.json → featured`) were complete about
 * the releases they listed and silent about four that MusicBrainz knows, so the list below is their
 * union: the owner's order and links, plus every release group from
 * `https://musicbrainz.org/ws/2/release-group?artist=bb843d35-fc0a-4d3b-b445-390b9b299812`
 * (read 2026-10-27, 11 release groups). Titles, types, years and `mbid`s are copied from that data —
 * nothing here is composed by the site, and `npm run releases:sync` re-runs the comparison.
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
  /**
   * MusicBrainz release-group id, when the release exists there.
   *
   * Round 35: the catalogue is reconciled against MusicBrainz (artist
   * `bb843d35-fc0a-4d3b-b445-390b9b299812`) instead of being typed from memory. The id is kept so
   * `npm run releases:sync` can diff this list against the live database without guessing which
   * row is which, and so a future Studio sync has a stable external key to match on.
   */
  mbid?: string;
}

export const releases: readonly Release[] = [
  {
    slug: "masih-mencintainya-papinka",
    title: "Masih Mencintainya",
    source: "Papinka",
    type: "remix",
    year: 2025,
    mbid: "7b9564aa-41ab-4a1c-b228-7e24abd92e42",
    links: [
      {
        label: "SoundCloud",
        href: "https://soundcloud.com/akbarnawasunda/masih-mencintainya-papinka-2025-akbar-nawasunda",
      },
    ],
  },
  {
    slug: "cinta-terbuang",
    title: "Cinta Terbuang",
    type: "single",
    year: 2025,
    mbid: "7d111ddf-99a1-429b-a258-cde80b358536",
    links: [],
  },
  {
    slug: "masih-dihatiku",
    title: "Masih Dihatiku",
    type: "single",
    year: 2025,
    mbid: "03101fc0-4204-4bac-9ec8-08dd19472185",
    links: [{ label: "Apple Music", href: "https://music.apple.com/id/album/masih-dihatiku-single/1816312737" }],
  },
  {
    slug: "bayang-tanpa-kata",
    title: "Bayang Tanpa Kata",
    type: "single",
    year: 2025,
    mbid: "c2cae577-d087-449c-97cf-b8ed3f19331c",
    links: [],
  },
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
    type: "remix",
    year: 2024,
    mbid: "9c0d7ad1-c678-4ea1-9133-c571feb3ed5f",
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
    mbid: "348af92a-9138-40e7-bd14-e4926560e146",
    links: [{ label: "Apple Music", href: "https://music.apple.com/id/song/kamu-nanyeak/1821914972?l=id" }],
  },
  {
    slug: "ngertenono-ati-medium-hall",
    title: "Ngertenono Ati Medium Hall",
    type: "remix",
    year: 2025,
    mbid: "a6f927de-edcd-4839-b55b-81caac27224a",
    links: [
      {
        label: "SoundCloud",
        href: "https://soundcloud.com/akbarnawasunda/ngertenono_ati_medium_hall_mbfrecords",
      },
    ],
  },

  /*
   * Round 35 — the four release groups that were missing from this list.
   *
   * They are the ones MusicBrainz knows and the site did not: the catalogue had been typed from the
   * owner's two handover files, and those files were never complete. Everything below comes straight
   * from `https://musicbrainz.org/ws/2/release-group?artist=bb843d35-fc0a-4d3b-b445-390b9b299812`
   * (fetched 2026-10-27): title, type, year and the release-group id are the database's own values.
   *
   * No link is listed for them because MusicBrainz' release-group list carries none — an empty
   * `links` array is the honest state, and the homepage falls back to the artist's own verified
   * profiles (`src/config/socials.ts`) for the stream buttons rather than inventing a track URL.
   */
  {
    slug: "yang-tak-pernah-usai",
    title: "Yang Tak Pernah Usai",
    type: "single",
    year: 2025,
    mbid: "38ef2ed1-73a6-48be-875d-97a47d29ff6f",
    links: [],
  },
  {
    slug: "satu-hari-cukup",
    title: "Satu Hari Cukup",
    type: "single",
    year: 2025,
    mbid: "ce16ef87-d5c0-4774-8ea2-3d6fc1e7e0af",
    links: [],
  },
  {
    slug: "apt-dj-akbar-remix",
    title: "APT (DJ Akbar Remix)",
    type: "remix",
    era: "DJ Akbar Remix",
    year: 2024,
    mbid: "66506c98-2e31-4972-826a-c3cf9beabe06",
    links: [],
  },
  {
    slug: "die-with-a-smile-warga-62-est-ce-que-tu-maimes-dj-akbar-remix",
    title: "Die With A Smile × Warga +62 × Est Ce Que Tu M'aimes (DJ Akbar Remix)",
    type: "remix",
    era: "DJ Akbar Remix",
    year: 2024,
    mbid: "91f276bf-e2e9-490d-ac60-0998bdbd411d",
    links: [],
  },
];

/**
 * The catalogue the public pages print, guaranteed non-empty.
 *
 * Round 35: the homepage used to be able to render with no releases at all — the Studio's published
 * list is the first source, and a Turso database that answers with zero rows (fresh install, wiped
 * table, a read that the fail-safe swallows) produced an empty front page. `releases` above is the
 * permanent floor: every page that shows the catalogue reads through this function, so "the songs
 * disappeared" is no longer a reachable state as long as the file has one entry.
 */
export function catalogueFloor(): readonly Release[] {
  return releases;
}

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
