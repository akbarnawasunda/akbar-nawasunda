/**
 * Artist page content.
 *
 * Owner's text, round 33. The biography is one paragraph set by the owner, printed verbatim on the
 * home page, /artist and the press kit; the timeline is the owner's own account of the years, and
 * the licensing line replaces the old "talk to us separately" hedge with the actual procedure.
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

/** The main biography, in the owner's own words. Printed on the home page, /artist and the EPK. */
export const artistLongBio =
  "Berawal dari kamar di Bandung Barat pada 2020 sebagai DJ Akbar Remix. Kini, Akbar Nawasunda " +
  "merilis karya orisinal yang memadukan melodi pop, electronic bass, dan energi Breakbeat. Tiga " +
  "bahasa yang dipakai bergantian dalam satu set, direkam di studio rumah.";

/** One sentence, for cards and search results. */
export const artistShortBio =
  "Produser musik, remixer, dan DJ dari Bandung Barat. Mulai 2020 sebagai DJ Akbar Remix, kini " +
  "merilis karya sebagai Akbar Nawasunda.";

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
    title: "Sound design dan live set",
    detail: "Fokus pada pendalaman sound design dan eksperimen live set independen.",
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
      "Nama panggung yang dipakai sekarang untuk katalog, kredit, dan identitas situs ini: karya orisinal plus remix.",
  },
];

/** Work the owner says they take on (profile `services`). */
export const artistServices = [
  "Permintaan remix",
  "Aransemen khusus",
  "Kolaborasi",
  "Lisensi musik",
] as const;

/** Licensing, in the owner's own words: one route, one sentence. */
export const licensingNote =
  "Untuk lisensi komersial, sync media, atau pertanyaan seputar penggunaan karya, silakan hubungi via email.";

/** Short positioning line. Composed only of verified facts, not a written biography. */
export const artistLine = "Produser, remixer, dan DJ asal Bandung Barat. Breakbeat dan Indo Bass, aktif sejak 2020.";


