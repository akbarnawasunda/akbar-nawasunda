/**
 * Langkah 3n — the catalogue as a ledger.
 *
 * `/music` used to be a wall: nine sleeves in a four-column grid with a 3D tunnel under the pointer.
 * The owner's decision (Langkah 3n, closing 3d) is that a catalogue page is a **record of records**,
 * not a mood board — every row states what it knows in columns, the way Discogs, Warp and Factory
 * print a discography, and the way this site's own `ReleasePlate` already prints the face of one
 * release further down.
 *
 * This module is the derivation, kept out of the component for the same reason
 * `src/content/release-hud.ts` exists: the row is data first. A component that reaches into the
 * catalogue itself can silently start filling gaps with its own copy; a pure function that takes a
 * release and returns six strings can be fed a fixture and proved.
 *
 * Rules it encodes, not invents:
 *
 *   ordinal    position in the owner's list, not a catalogue number. This catalogue has none.
 *   type       `releaseTypeLabel`, or `UNCLASSIFIED` when the type is unknown (Langkah 3i).
 *   year       the year only when it is known; `UNRECORDED` otherwise — never a blank, never a dash.
 *   streaming  `releaseStreamingStatus()`, the same helper the HUD, the release page and the meta
 *              description use (Langkah 3m). Not re-derived here.
 *
 * The year is printed in its own column rather than inside the eyebrow line, because a ledger is
 * read down a column: the question "which years does this catalogue cover" gets an answer by
 * scanning one strip of the table.
 */
import { RELEASE_TYPE_LABELS, publicReleaseDate, type ReleaseDocument } from "../studio/releases";
import type { CoverArtwork } from "./covers";
import { UNCLASSIFIED, UNRECORDED } from "./copy";
import {
  releaseDisplayTitle,
  releaseStreamingStatus,
  releaseTypeLabel,
  type Release,
  type ReleaseStreamingStatus,
} from "./releases";

export interface LedgerRow {
  slug: string;
  /** `01` … `10`, in the owner's order. */
  ordinal: string;
  /** Display title, original artist included when known. */
  title: string;
  /** Type label, or `UNCLASSIFIED`. Never blank. */
  type: string;
  /** Four-digit year, or `UNRECORDED`. Never blank. */
  year: string;
  /** Resolved on the server; the row renders a 56px plate of it. */
  artwork: CoverArtwork;
  streaming: ReleaseStreamingStatus;
  href: string;
}

const ordinal = (index: number) => String(index + 1).padStart(2, "0");

/** One row from a static catalogue entry. */
export function ledgerRowFromRelease(
  release: Release,
  artwork: CoverArtwork,
  index: number,
): LedgerRow {
  return {
    slug: release.slug,
    ordinal: ordinal(index),
    title: releaseDisplayTitle(release),
    type: release.type ? releaseTypeLabel[release.type] : UNCLASSIFIED,
    year: release.year ? String(release.year) : UNRECORDED,
    artwork,
    streaming: releaseStreamingStatus(release),
    href: `/music/${release.slug}`,
  };
}

/**
 * One row from a published Studio record.
 *
 * The year comes from the same function the release page uses (`publicReleaseDate`), which returns a
 * date only when the owner marked it verified — so an unverified date is `UNRECORDED` here too,
 * rather than a number the Studio has not vouched for.
 */
export function ledgerRowFromDocument(
  slug: string,
  doc: ReleaseDocument,
  artwork: CoverArtwork,
  index: number,
): LedgerRow {
  const date = publicReleaseDate(doc);
  return {
    slug,
    ordinal: ordinal(index),
    title: doc.title,
    type: RELEASE_TYPE_LABELS[doc.type] ?? UNCLASSIFIED,
    year: date ? date.slice(0, 4) : UNRECORDED,
    artwork,
    streaming: releaseStreamingStatus({ slug, links: doc.links }),
    href: `/music/${slug}`,
  };
}

/**
 * The ledger's own invariant, exported so both the page and the test assert the same thing: one row
 * per release, in order, no gaps. A ledger with a missing row is worse than a wall with a missing
 * tile — the eye reads a numbered table as complete.
 */
export function assertLedgerComplete(rows: readonly LedgerRow[], expected: number): void {
  if (rows.length !== expected) {
    throw new Error(`Ledger has ${rows.length} rows for ${expected} releases`);
  }
  rows.forEach((row, index) => {
    if (row.ordinal !== ordinal(index)) {
      throw new Error(`Row ${index} is numbered ${row.ordinal}`);
    }
  });
}
