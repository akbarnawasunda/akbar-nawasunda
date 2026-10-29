/**
 * Design tokens are not the only vocabulary this site has. So is its copy.
 *
 * Langkah 3i: the public voice is cold, precise, catalogical — a data sheet, not a pitch. This file
 * is the list, in one place, so the two guards that read it cannot drift apart:
 *
 *   tests/studio/copy-voice.test.ts   source-literal scan, runs in `npm test`
 *   scripts/qa-copy.mjs               rendered-DOM scan, runs in CI against a real build
 *
 * Two tiers, because two different things are being protected:
 *
 * 1. `BANNED_COPY_TERMS` — hype, marketing, Web3, AI-register. No exemptions. These words cannot
 *    appear anywhere a visitor can read them, in any casing, in any inflection.
 *
 * 2. `OWNER_COPY_ONLY_TERMS` — ordinary Indonesian words that the owner's own biography uses
 *    ("perjalanan musik", "karya orisinal"). The biography is the artist's own text, handed over
 *    verbatim, and rewriting an artist's own statement is not a copy edit — it is putting words in
 *    their mouth. So those two words are allowed inside exactly one element per page, marked
 *    `data-copy-origin="owner-verbatim"`, and banned everywhere else. That way the exemption is
 *    narrow, visible in the DOM, and asserted by both guards instead of hidden in a comment.
 *
 * Matching is a case-insensitive substring, deliberately, so Indonesian inflections are caught
 * without listing every form: "jelajah" also catches "menjelajah" and "menjelajahi", "eksplor"
 * catches "eksplorasi" and "mengeksplorasi". English terms are listed in full.
 */

/** No exemptions, no context, no exceptions. */
export const BANNED_COPY_TERMS = [
  // --- Indonesian marketing / hype ---------------------------------------------------
  "jelajah",
  "eksplor",
  "keajaiban",
  "memukau",
  "selami",
  "menakjubkan",
  "mengagumkan",
  "spektakuler",
  "fantastis",
  "luar biasa",
  "tak terlupakan",
  "tiada tara",
  "mendunia",
  "kelas dunia",
  "wajib dikunjungi",
  "pengalaman luar biasa",
  "arsip eksklusif",
  "visual memukau",
  "premium",
  "eksklusif",
  "inovatif",
  "revolusioner",
  "transformasi",
  "kisah",
  "magis",
  "sinematik",
  "epik",
  // --- English marketing -------------------------------------------------------------
  "world-class",
  "next-level",
  "game-changer",
  "cutting-edge",
  "state-of-the-art",
  "best-in-class",
  "immersive",
  "seamless",
  "unleash",
  "elevate",
  "revolutionary",
  "innovative",
  // --- distribution claims the data cannot support ------------------------------------
  /*
   * Langkah 3m. Three releases carry `links: []`, which proves only that no link was recorded — not
   * that the record is undistributed. These four phrases are how the forbidden claim would arrive:
   * a card headed "dubplate", a note saying "belum rilis", an English "unreleased", or the sentence
   * PRD §2 forbids word for word. The neutral status that IS allowed lives in
   * `src/content/releases.ts` (`RELEASE_STREAMING_UNRECORDED`), and it says "belum tercatat".
   */
  "dubplate",
  "unreleased",
  "belum rilis",
  "tidak didistribusikan",
  // --- Web3 --------------------------------------------------------------------------
  "web3",
  "nft",
  "blockchain",
  "metaverse",
  "airdrop",
  "token-gated",
];

/**
 * Allowed only inside the owner's own biography (`data-copy-origin="owner-verbatim"`).
 *
 * Both are ordinary Indonesian nouns — "perjalanan musik" is how the owner opens their own bio, and
 * "karya orisinal" is a factual description of their catalogue, not a superlative. They are listed
 * here rather than in `BANNED_COPY_TERMS` because the site's chrome copy must not use them: a page
 * does not get to tell the visitor about a "journey".
 */
export const OWNER_COPY_ONLY_TERMS = ["perjalanan", "karya"];

/** The attribute that marks the one exempted block per page. Set in the components, read by both guards. */
export const OWNER_COPY_ORIGIN = "owner-verbatim";

/**
 * Returns every term from `terms` found in `text`.
 *
 * @param {string} text
 * @param {readonly string[]} terms
 * @returns {string[]}
 */
export function findTerms(text, terms) {
  const haystack = text.toLowerCase();
  return terms.filter((term) => haystack.includes(term.toLowerCase()));
}

/**
 * The empty-value placeholders that must never reach a visitor: a field printed as a bare dash
 * tells the reader nothing, and an "undefined" is a bug in a suit. Missing data is either hidden or
 * given an explicit technical status (`src/content/copy.ts`).
 */
export const BANNED_EMPTY_VALUES = ["—", "--", "-", "undefined", "null", "n/a", "n.a.", ""];
