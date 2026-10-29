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

/* ------------------------------------------------------------------ streaming */

/**
 * Langkah 3m — the one place that decides what a release's streaming status says.
 *
 * Before this there were three answers to the same question, written by three files:
 *
 *   Bottom Release HUD   "Halaman rilis"
 *   release page         "Tautan mendengarkan untuk rilis ini belum tersedia."
 *   SEO description       the platform clause simply vanished
 *
 * Three different sentences for one fact is how a data sheet starts guessing. The owner's decision
 * (Langkah 3m, closing the 3b blocker) is that the state is permanent and neutral: a release with no
 * recorded link prints `TAUTAN STREAMING: BELUM TERCATAT` and points at its own page, everywhere,
 * and nothing anywhere claims the record is undistributed.
 *
 * That distinction is the whole point. `links: []` proves only that nobody recorded a link. It does
 * not prove the release is not on DSPs — the two are different facts and only the owner can tell
 * them apart (`docs/PRD.md` §2). "Belum tercatat" is true in both cases, so it is the only sentence
 * that cannot become a lie. `BANNED_COPY_TERMS` carries `dubplate`, `unreleased`, `belum rilis` and
 * `tidak didistribusikan` so no future edit can smuggle the claim back in.
 *
 * The href is the release's own page rather than nothing at all: a row in a ledger with an inert
 * status is a dead end, and the page it points at is the one place that explains what IS known.
 */
export const RELEASE_STREAMING_UNRECORDED = "TAUTAN STREAMING: BELUM TERCATAT";

export interface ReleaseStreamingStatus {
  /** What to print where a platform name goes. */
  label: string;
  /** External platform URL, or the release's own page when nothing is recorded. */
  href: string;
  /** `true` → another site (new tab). `false` → a route on this site. */
  external: boolean;
  /** `true` when at least one platform is recorded. Never inferred from anything else. */
  recorded: boolean;
}

/**
 * Takes the two fields it needs, not a whole `Release`, so a published Studio record — which never
 * becomes a `Release` object — runs through the same function instead of a copy of it.
 */
export function releaseStreamingStatus(
  release: Pick<Release, "slug" | "links">,
): ReleaseStreamingStatus {
  /* The owner wrote the links; the first one is their order, not a ranking this file invented. */
  const first = release.links[0];
  if (first) {
    return { label: first.label, href: first.href, external: true, recorded: true };
  }
  return {
    label: RELEASE_STREAMING_UNRECORDED,
    href: `/music/${release.slug}`,
    external: false,
    recorded: false,
  };
}

/**
 * Meta description for a release page, assembled only from fields that actually exist.
 *
 * Langkah 3k. What it replaces was one template for all ten releases —
 * `"${title} — rilis terverifikasi Akbar Nawasunda."` — which is 50–53 characters of identical text
 * with the title swapped in. A search result showing ten near-identical snippets tells a reader
 * nothing about which one to open, and the phrase "rilis terverifikasi" is the site vouching for
 * itself rather than describing the record.
 *
 * So the sentence is built from the record: type and year when known, the platforms the release is
 * genuinely on. Where a field is missing, its clause is dropped — never filled with a placeholder.
 * Three releases have no link at all (`cinta-terbuang`, `bayang-tanpa-kata`,
 * `hitungan-cinta-breakbeat-super-exc`), so they never claim availability anywhere; the first two
 * also carry no type and no year, and fall back to a plain statement about what the page is.
 *
 * Every branch starts with the display title, so the ten strings cannot collide.
 */
export function releaseDescription(release: Release): string {
  const title = releaseDisplayTitle(release);

  // One clause per fact, dropped when the fact is absent. "2024 dari katalog …" reads like a
  // fragment, so a year without a type gets the verb: "Rilis 2024 dari katalog …".
  const facts = release.type
    ? `${releaseTypeLabel[release.type]}${release.year ? ` ${release.year}` : ""} dari katalog Akbar Nawasunda.`
    : release.year
      ? `Rilis ${release.year} dari katalog Akbar Nawasunda.`
      : release.era
        ? `Rilis era ${release.era} di katalog Akbar Nawasunda.`
        : "Halaman rilis resmi di akbarnawasunda.my.id.";

  /*
   * The availability clause asks the same helper as the page body, so "does this release have a
   * platform" has one answer in the codebase. A description is a sentence, not a status strip, so
   * when nothing is recorded the clause is dropped rather than printing "BELUM TERCATAT" into a
   * search result — but the *decision* still comes from `releaseStreamingStatus()`.
   */
  const status = releaseStreamingStatus(release);
  const platforms = [...new Set(release.links.map((link) => link.label))];
  const availability = status.recorded && platforms.length > 0 ? ` Tersedia di ${platforms.join(", ")}.` : "";

  return `${title}. ${facts}${availability}`;
}
