import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UNCLASSIFIED, UNRECORDED } from "../../src/content/copy";
import {
  RELEASE_STREAMING_UNRECORDED,
  releaseSpecification,
  releaseStreamingStatus,
  releaseTypeLabel,
  releases,
} from "../../src/content/releases";

/**
 * Langkah 3o — the homepage prints four facts about the featured release.
 *
 * A spec sheet fails quietly: one blank cell or one invented number still looks like a spec sheet.
 * These assertions are about the three ways that happens — an empty value, a value that does not
 * exist in the data, and a platform column that decides the streaming question on its own.
 */
describe("release specification — the four rows", () => {
  it("prints exactly the four documented rows, in the documented order", () => {
    for (const release of releases) {
      assert.deepEqual(
        releaseSpecification(release).map((row) => row.label),
        ["Tipe", "Tahun", "Era", "Platform"],
        `${release.slug}: row set changed`,
      );
    }
  });

  it("never prints an empty cell", () => {
    for (const release of releases) {
      for (const row of releaseSpecification(release)) {
        assert.ok(row.value.trim().length > 0, `${release.slug}: empty ${row.label}`);
        assert.notEqual(row.value, "—", `${release.slug}: ${row.label} fell back to a dash`);
      }
    }
  });

  it("only states facts that exist in the data", () => {
    for (const release of releases) {
      const rows = Object.fromEntries(releaseSpecification(release).map((row) => [row.label, row.value]));
      assert.equal(rows["Tahun"], release.year ? String(release.year) : UNRECORDED, `${release.slug}: year`);
      assert.equal(rows["Era"], release.era ?? UNRECORDED, `${release.slug}: era`);
      assert.equal(rows["Tipe"], release.type ? releaseTypeLabel[release.type] : UNCLASSIFIED, `${release.slug}: type`);
      /* The fields that do not exist must never appear — this is the guard against a future edit
         inventing duration/BPM/key for the homepage's benefit. */
      assert.equal(Object.keys(rows).length, 4, `${release.slug}: a fifth row appeared`);
    }
  });

  it("takes Platform from the Langkah 3m helper, fallback included", () => {
    for (const release of releases) {
      const platform = releaseSpecification(release).find((row) => row.label === "Platform")!.value;
      assert.equal(platform, releaseStreamingStatus(release).label, `${release.slug}: platform drifted from the helper`);
    }
    const unrecorded = releases.find((release) => release.links.length === 0);
    assert.ok(unrecorded, "no release exercises the no-links path");
    assert.equal(
      releaseSpecification(unrecorded).find((row) => row.label === "Platform")!.value,
      RELEASE_STREAMING_UNRECORDED,
    );
  });

  it("uses the neutral status, never a claim about distribution", () => {
    const banned = /tidak didistribusikan|dubplate|unreleased|belum rilis/i;
    for (const release of releases) {
      for (const row of releaseSpecification(release)) {
        assert.doesNotMatch(row.value, banned, `${release.slug}: ${row.value}`);
      }
    }
  });
});
