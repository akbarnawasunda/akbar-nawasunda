/**
 * Artist page content.
 *
 * Every line here is either a verified fact (docs/01-BRAND-IDENTITY/FACTS_AND_VERIFICATION_2.md)
 * or an explicit placeholder. There is no approved long bio yet — ARTIST_PROFILE.md lists it as
 * `[NEEDS OWNER: Long bio 150-200 kata ID]` — so the page states what is known and marks the rest
 * instead of writing prose that would then have to be retracted.
 *
 * Birth date is deliberately absent: it is marked "owner confirm pending" and a public site does not
 * need a date of birth to describe the work.
 */

export interface ArtistFact {
  label: string;
  /** Verified value, or null when the owner still has to supply it. */
  value: string | null;
}

export interface TimelineEntry {
  /** Year column; "Sekarang" for the present state. */
  marker: string;
  title: string;
  detail: string;
  /** A dashed "not verified yet" row instead of a solid timeline node. */
  pending?: boolean;
}

export const artistFacts: readonly ArtistFact[] = [
  { label: "Nama panggung", value: "Akbar Nawasunda" },
  { label: "Nama legal", value: "Idel Akbar Ramadan" },
  { label: "Alias", value: "DJ Akbar Remix" },
  { label: "Basis", value: "Bandung Barat, Indonesia" },
  { label: "Aktif sejak", value: "2020" },
  { label: "Genre", value: "Breakbeat, Indo Bass, Jedag Jedug, Jungle Dutch" },
];

/**
 * The name change is the one piece of career narrative the sources actually support: the alias
 * "DJ Akbar Remix" and the stage name "Akbar Nawasunda" are both VERIFIED, and the catalog carries
 * a "DJ Akbar Remix" era on one release. The years in between are not documented, so the timeline
 * shows the two anchors and one honest gap rather than invented milestones.
 */
export const artistTimeline: readonly TimelineEntry[] = [
  {
    marker: "2020",
    title: "DJ Akbar Remix",
    detail: "Alias pertama. Aktif sejak 2020; nama ini dipakai di kanal YouTube dan rilisan era awal.",
  },
  {
    marker: "2021 – 2024",
    title: "Tonggak karier",
    detail: "Kolaborasi, rilis, dan penampilan pada periode ini belum terdokumentasi di sumber resmi.",
    pending: true,
  },
  {
    marker: "2025",
    title: "Masih Mencintainya — Papinka",
    detail: "Rilis terverifikasi terbaru di katalog: interpretasi lagu Papinka.",
  },
  {
    marker: "Sekarang",
    title: "Akbar Nawasunda",
    detail: "Nama panggung yang dipakai sekarang untuk katalog, kredit, dan identitas situs ini.",
  },
];

/** Short positioning line. Composed only of verified facts, not a written biography. */
export const artistLine =
  "Produser, remixer, dan DJ asal Bandung Barat. Breakbeat dan Indo Bass, aktif sejak 2020.";

export const artistBioNeeded = [
  "Bio panjang 150–200 kata dalam Bahasa Indonesia",
  "Linimasa 2021–2024: rilis, kolaborasi, dan penampilan",
  "Pengaruh musik dan cerita di balik nama Nawasunda",
] as const;
