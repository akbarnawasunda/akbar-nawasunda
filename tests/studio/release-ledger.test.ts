import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertLedgerComplete,
  ledgerRowFromRelease,
  type LedgerRow,
} from "../../src/content/release-ledger";
import {
  RELEASE_STREAMING_UNRECORDED,
  releaseDisplayTitle,
  releases,
} from "../../src/content/releases";
import { UNCLASSIFIED, UNRECORDED } from "../../src/content/copy";
import type { CoverArtwork } from "../../src/content/covers";

/**
 * Langkah 3n — the ledger is the catalogue, not an illustration of it.
 *
 * The failure this guards against is not a crash: it is a table that looks complete while a row is
 * missing, misnumbered, or quietly empty. A wall of sleeves can lose a tile and still read as a wall.
 * A numbered table cannot — the eye counts it — so every invariant is asserted here rather than
 * trusted to the component.
 */
const artwork: CoverArtwork = { kind: "image", src: "/assets/covers/fixture@sleeve.webp" };

const rowsFor = (): LedgerRow[] => releases.map((release, index) => ledgerRowFromRelease(release, artwork, index));

describe("release ledger — rows", () => {
  it("prints exactly one row per release, numbered 01..N in the owner's order", () => {
    const rows = rowsFor();
    assert.equal(rows.length, releases.length);
    assertLedgerComplete(rows, releases.length);

    rows.forEach((row, index) => {
      assert.equal(row.ordinal, String(index + 1).padStart(2, "0"), `${row.slug}: wrong ordinal`);
      assert.equal(row.slug, releases[index]?.slug, `${row.slug}: row order differs from releases.ts`);
      assert.equal(row.title, releaseDisplayTitle(releases[index]!), `${row.slug}: title is not the display title`);
    });
  });

  it("never prints an empty cell — a missing fact states that it is missing", () => {
    for (const row of rowsFor()) {
      for (const [field, value] of Object.entries({ title: row.title, type: row.type, year: row.year, label: row.streaming.label })) {
        assert.ok(value.trim().length > 0, `${row.slug}: empty ${field}`);
        assert.notEqual(value, "—", `${row.slug}: ${field} fell back to a dash`);
      }
      assert.match(row.year, /^(\d{4}|Tidak tercatat)$/, `${row.slug}: year is neither a year nor the status`);
    }

    /*
     * The two constants are the only acceptable stand-ins, and they say what they mean. Derived from
     * the catalogue rather than pinned to a number this file guessed: the first version asserted
     * "3 unclassified", which is the count of releases with no *links*, not the count with no
     * *type* (5). A count that has to be corrected by hand is a count that will be wrong again.
     */
    const rows = rowsFor();
    for (const row of rows) {
      const release = releases.find((entry) => entry.slug === row.slug)!;
      assert.equal(row.type, release.type ? row.type : UNCLASSIFIED, `${row.slug}: type is not the label or the status`);
      assert.equal(row.year, release.year ? String(release.year) : UNRECORDED, `${row.slug}: year rule broken`);
    }
    assert.ok(rows.some((row) => row.type === UNCLASSIFIED), "no release exercises the unclassified path");
    assert.ok(rows.some((row) => row.year === UNRECORDED), "no release exercises the unrecorded-year path");
  });

  it("takes the streaming column from the shared helper, including the three with no links", () => {
    const rows = rowsFor();
    for (const row of rows) {
      const release = releases.find((entry) => entry.slug === row.slug)!;
      assert.equal(row.streaming.recorded, release.links.length > 0, `${row.slug}: recorded flag is not from links`);
      if (release.links.length === 0) {
        assert.equal(row.streaming.label, RELEASE_STREAMING_UNRECORDED);
        assert.equal(row.streaming.href, `/music/${row.slug}`, `${row.slug}: an unrecorded row must point at its own page`);
      } else {
        assert.equal(row.streaming.label, release.links[0]!.label, `${row.slug}: label is not the owner's first link`);
        assert.equal(row.streaming.external, true);
      }
    }

    const unrecorded = rows.filter((row) => !row.streaming.recorded).map((row) => row.slug).sort();
    assert.deepEqual(unrecorded, ["bayang-tanpa-kata", "cinta-terbuang", "hitungan-cinta-breakbeat-super-exc"]);
  });

  it("links every row to its own release page", () => {
    for (const row of rowsFor()) {
      assert.equal(row.href, `/music/${row.slug}`);
    }
  });

  it("throws when a row is missing or misnumbered, so the page cannot paint a short table", () => {
    const rows = rowsFor();
    assert.throws(() => assertLedgerComplete(rows.slice(1), releases.length), /rows for/);
    const broken = [...rows];
    broken[2] = { ...broken[2]!, ordinal: "09" };
    assert.throws(() => assertLedgerComplete(broken, releases.length), /numbered/);
  });
});
