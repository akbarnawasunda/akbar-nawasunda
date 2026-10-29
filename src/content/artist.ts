/**
 * Artist page content.
 *
 * Source: the owner's own profile file, handed over 2026-10-24
 * (`artistPlatform.ts → verifiedArtistProfile` and `content.json → bio.id`). The long bio below is
 * the owner's text, copied — not expanded, not re-written in a more flattering voice. It is shorter
 * than the 150–200 words the brief asked for, and it stays short: padding a biography with plausible
 * sentences is how a site starts inventing a career.
 *
 * Still open, and therefore still printed as a gap rather than filled:
 * - milestones 2021–2023 (the owner's timeline jumps from 2020 to the current name);
 * - a second alias, label, or management contact, which no sources mention.
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
  { label: "Genre", value: "Breakbeat, Indo Bass, Jedag Jedug, Jungle Dutch, Kendang Chops" },
];

/** The owner's own biography, in Indonesian. Verbatim from their profile file. */
export const artistLongBio =
  "Perjalanan musik Akbar Nawasunda dimulai pada 2020 sebagai bedroom producer independen dengan " +
  "nama DJ Akbar Remix. Eksperimennya membawa lagu-lagu populer ke wilayah Breakbeat, Jedag Jedug, " +
  "dan Jungle Dutch bergaya Bandung. Kini, di bawah nama Akbar Nawasunda, ia merilis karya orisinal " +
  "yang memadukan melodi pop, electronic bass, dan energi remix untuk platform musik digital global.";

/** One sentence, for cards and search results. */
export const artistShortBio =
  "Produser musik, remixer, dan DJ dari Bandung Barat. Mulai 2020 sebagai DJ Akbar Remix, kini " +
  "merilis sebagai Akbar Nawasunda.";

/**
 * The name change is the spine of the timeline, and the catalogue now supplies the years around it:
 * 2024 has four documented releases, 2025 has four more. 2021–2023 still has nothing in any source,
 * so it is shown as a gap — a dashed row is information, an invented milestone is not.
 */
export const artistTimeline: readonly TimelineEntry[] = [
  {
    marker: "2020",
    title: "DJ Akbar Remix",
    detail:
      "Alias pertama. Bedroom producer independen yang mengangkat lagu populer ke Breakbeat, Jedag Jedug, dan Jungle Dutch bergaya Bandung.",
  },
  {
    marker: "2021 – 2023",
    title: "Tonggak karier",
    detail: "Kolaborasi, rilis, dan penampilan pada periode ini belum terdokumentasi di sumber resmi.",
    pending: true,
  },
  {
    marker: "2024",
    title: "Rilis orisinal pertama",
    detail: "Lali Dalane dan DJ Rantau Den Panjauah terbit, bersama dua remix di SoundCloud.",
  },
  {
    marker: "2025",
    title: "Masih Mencintainya — Papinka",
    detail:
      "Empat rilis sepanjang tahun: interpretasi lagu Papinka, Pada Imut Aisyah Tak Belagu, Kamu Nanyeak, dan Ngertenono Ati.",
  },
  {
    marker: "Sekarang",
    title: "Akbar Nawasunda",
    detail:
      "Nama panggung yang dipakai sekarang untuk katalog, kredit, dan identitas situs ini: rilis orisinal dan remix.",
  },
];

/** Work the owner says they take on (profile `services`). */
export const artistServices = [
  "Permintaan remix",
  "Aransemen khusus",
  "Kolaborasi",
  "Lisensi musik",
] as const;

/** Licensing posture, condensed from the owner's own note. */
export const licensingNote =
  "Untuk penggunaan musik di konten, hubungi lewat email. Penggunaan komersial dibicarakan terpisah; " +
  "penggunaan non-komersial dengan kredit sangat diapresiasi.";

/** Short positioning line. Composed only of verified facts, not a written biography. */
export const artistLine = "Produser, remixer, dan DJ asal Bandung Barat. Breakbeat dan Indo Bass, aktif sejak 2020.";

/** What is still missing from the owner, shown where it matters instead of being invented. */
export const artistBioGaps = [
  "Linimasa 2021–2023: rilis, kolaborasi, dan penampilan",
  "Pengaruh musik dan cerita di balik nama Nawasunda",
] as const;
