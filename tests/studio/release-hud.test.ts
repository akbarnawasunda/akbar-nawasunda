import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { releaseHudModel, RELEASE_HUD_FALLBACK_LABEL } from "../../src/content/release-hud";
import { releaseDisplayTitle, releaseEyebrow, releases, type Release } from "../../src/content/releases";

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

  it("falls back to the release page, with a neutral label, when the release has no links", () => {
    const model = releaseHudModel(withoutLinks);

    assert.deepEqual(model.action, {
      href: "/music/fixture-tanpa-tautan",
      label: RELEASE_HUD_FALLBACK_LABEL,
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
