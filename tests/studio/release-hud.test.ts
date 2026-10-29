import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { releaseHudModel } from "../../src/content/release-hud";
import {
  RELEASE_STREAMING_UNRECORDED,
  releaseDisplayTitle,
  releaseEyebrow,
  releaseStreamingStatus,
  releases,
  type Release,
} from "../../src/content/releases";

/**
 * Langkah 3f — the Bottom Release HUD must print real release data, never a literal.
 *
 * The failure mode DESIGN.md §5 warns about ("komponen ada tapi selalu null karena props tidak
 * dikirim") and the failure mode it does not name but which looks identical from the outside (a
 * component with a plausible hard-coded title behind the prop) both die here: the fixtures below are
 * synthetic releases, so nothing in the component's own source can satisfy them by accident.
 */

const withLinks: Release = {
  slug: "fixture-dengan-tautan",
  title: "Judul Uji",
  source: "Penyanyi Uji",
  type: "remix",
  year: 1999,
  links: [{ label: "Contoh Platform", href: "https://example.test/release/fixture" }],
};

const withoutLinks: Release = {
  slug: "fixture-tanpa-tautan",
  title: "Judul Tanpa Tautan",
  year: 2024,
  links: [],
};

describe("bottom release HUD — data", () => {
  it("takes the title, the eyebrow and the destination from the release it is handed", () => {
    const model = releaseHudModel(withLinks);

    assert.equal(model.title, "Judul Uji — Penyanyi Uji", "title must be the display title, source included");
    assert.equal(model.eyebrow, "Remix · 1999", "eyebrow must be the release eyebrow");
    assert.deepEqual(model.action, {
      href: "https://example.test/release/fixture",
      label: "Contoh Platform",
      external: true,
    });
  });

  it("falls back to the release page, with the catalogue-wide status, when the release has no links", () => {
    const model = releaseHudModel(withoutLinks);

    assert.deepEqual(model.action, {
      href: "/music/fixture-tanpa-tautan",
      label: RELEASE_STREAMING_UNRECORDED,
      external: false,
    });

    /*
     * The 3b blocker, as a test. Three releases carry `links: []`; `docs/PRD.md` §2 says the data
     * proves only that no link was recorded, never that the release is undistributed. If this label
     * ever grows a claim, the suite goes red before the claim reaches a reader.
     */
    const claim = /tidak (di)?distribusi|tanpa distribusi|dubplate|eksklusif|belum rilis|unreleased/i;
    assert.ok(!claim.test(model.action.label), `label must not claim distribution: "${model.action.label}"`);
    assert.ok(
      !claim.test(model.title) && !claim.test(model.eyebrow),
      "neither title nor eyebrow may carry a distribution claim",
    );
  });

  it("never returns null, for any release in the real catalogue", () => {
    assert.ok(releases.length > 0);
    for (const release of releases) {
      const model = releaseHudModel(release);
      assert.ok(model.title.trim().length > 0, `${release.slug}: empty title`);
      assert.ok(model.eyebrow.trim().length > 0, `${release.slug}: empty eyebrow`);
      assert.ok(model.action.href.length > 0, `${release.slug}: empty destination`);
      assert.ok(model.action.label.trim().length > 0, `${release.slug}: empty label`);
    }
  });

  it("shows the first release in the owner's order, and links to its own first link", () => {
    const first = releases[0]!;
    const model = releaseHudModel(first);

    /*
     * Derived, not typed: the expectation is recomputed from the release, so renaming the release
     * in the data updates the test with it — and a hard-coded string in the component could not
     * satisfy it after such a rename.
     */
    assert.equal(model.title, releaseDisplayTitle(first));
    assert.equal(model.eyebrow, releaseEyebrow(first));
    assert.equal(model.slug, first.slug);

    const firstLink = first.links[0];
    if (firstLink) {
      assert.equal(model.action.href, firstLink.href);
      assert.equal(model.action.label, firstLink.label);
      assert.equal(model.action.external, true);
    } else {
      assert.equal(model.action.href, `/music/${first.slug}`);
      assert.equal(model.action.external, false);
    }
  });
});

describe("streaming status — one helper, one answer", () => {
  /*
   * Langkah 3m closed the 3b blocker with a policy, not a verification: the owner declared that an
   * unrecorded streaming link is a permanent, neutral state. This block is what keeps the policy
   * from decaying into three slightly different sentences again — every surface that prints the
   * state is checked against the same helper, and the forbidden claim is checked against the label
   * that would carry it.
   */
  const claim = /tidak (di)?distribusi|tanpa distribusi|dubplate|eksklusif|belum rilis|unreleased/i;

  it("says 'not recorded', never a claim about distribution", () => {
    assert.equal(RELEASE_STREAMING_UNRECORDED, "TAUTAN STREAMING: BELUM TERCATAT");
    assert.ok(!claim.test(RELEASE_STREAMING_UNRECORDED), "the status itself claims distribution");
  });

  it("takes the owner's first link when one exists, and the release page when none does", () => {
    const recorded = releaseStreamingStatus(withLinks);
    assert.deepEqual(recorded, {
      label: "Contoh Platform",
      href: "https://example.test/release/fixture",
      external: true,
      recorded: true,
    });

    const unrecorded = releaseStreamingStatus(withoutLinks);
    assert.deepEqual(unrecorded, {
      label: RELEASE_STREAMING_UNRECORDED,
      href: "/music/fixture-tanpa-tautan",
      external: false,
      recorded: false,
    });
  });

  it("gives the same answer to the HUD that it gives to every other surface", () => {
    for (const release of releases) {
      const status = releaseStreamingStatus(release);
      const hud = releaseHudModel(release);
      assert.equal(hud.action.label, status.label, `${release.slug}: HUD label disagrees with the helper`);
      assert.equal(hud.action.href, status.href, `${release.slug}: HUD destination disagrees`);
      assert.equal(hud.action.external, status.external, `${release.slug}: HUD external flag disagrees`);
    }
  });

  it("covers the three catalogue entries with no recorded link", () => {
    const unrecorded = releases.filter((release) => release.links.length === 0);
    assert.deepEqual(
      unrecorded.map((release) => release.slug).sort(),
      ["bayang-tanpa-kata", "cinta-terbuang", "hitungan-cinta-breakbeat-super-exc"],
      "the set of link-less releases changed — re-read docs/PRD.md §2 before trusting this policy",
    );
    for (const release of unrecorded) {
      const status = releaseStreamingStatus(release);
      assert.equal(status.recorded, false);
      assert.equal(status.href, `/music/${release.slug}`);
      assert.ok(!claim.test(status.label));
    }
  });

  it("never lets the helper's label go blank for any real release", () => {
    for (const release of releases) {
      const status = releaseStreamingStatus(release);
      assert.ok(status.label.trim().length > 0, `${release.slug}: empty label`);
      assert.ok(status.href.startsWith("/") || status.href.startsWith("https://"), `${release.slug}: odd href`);
    }
  });
});
