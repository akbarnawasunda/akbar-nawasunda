/**
 * Public copy constants.
 *
 * Langkah 3i: a field the owner has not supplied is never printed as a dash. An em dash in a data
 * sheet reads as "this field exists and is blank", which is a different, worse claim than "nobody has
 * recorded this yet". Both constants below are explicit statuses, chosen so the sentence still parses
 * as a catalogue entry:
 *
 *   Jenis   Tidak tercatat
 *   Tahun   Tidak tercatat
 *   Cinta Terbuang          Belum terklasifikasi
 *
 * They are imported by the renderers rather than typed in place, because "no empty values" is a rule
 * (`scripts/qa-copy.mjs` asserts it against the real DOM) and a rule with five copies is five places
 * for it to rot.
 */

/** A fact the owner has not supplied yet. Replaces the old `—` placeholder. */
export const UNRECORDED = "Tidak tercatat";

/** A release whose type, year and era are all still unknown. Replaces the old "Rilis" fallback. */
export const UNCLASSIFIED = "Belum terklasifikasi";

/**
 * Marks the one block on a page that is the artist's own text, verbatim.
 *
 * Read by `scripts/qa-copy.mjs` and `tests/studio/copy-voice.test.ts`: two ordinary Indonesian words
 * ("perjalanan", "karya") are allowed inside this block and nowhere else. The block is asserted to be
 * the real biography, so the attribute cannot quietly become a place to hide a headline.
 */
export const OWNER_COPY = "owner-verbatim";
