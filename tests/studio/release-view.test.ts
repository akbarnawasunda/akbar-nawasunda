import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { coverCandidates } from "../../src/content/covers";
import { fromReleaseDocument, fromStaticRelease } from "../../src/content/release-view";
import { releaseEyebrow, releases } from "../../src/content/releases";
import type { ReleaseDocument } from "../../src/studio/releases";

const doc: ReleaseDocument = {
  title: "Cinta Terbuang",
  type: "unknown",
  releaseDate: null,
  dateVerified: false,
  description: "",
  artworkId: null,
  links: [],
  seoTitle: "",
  seoDescription: "",
};

describe("cover lookup", () => {
  it("offers the documented extensions in preference order", () => {
    assert.deepEqual(coverCandidates("cinta-terbuang"), [
      "/assets/covers/cinta-terbuang.webp",
      "/assets/covers/cinta-terbuang.avif",
      "/assets/covers/cinta-terbuang.jpg",
      "/assets/covers/cinta-terbuang.jpeg",
      "/assets/covers/cinta-terbuang.png",
    ]);
  });
});

describe("release view mapping", () => {
  it("falls back to the typographic card when no cover file exists", () => {
    const release = releases[1];
    assert.ok(release);
    const view = fromStaticRelease(release, null);
    assert.equal(view.coverUrl, null);
    assert.equal(view.title, "Cinta Terbuang");
    assert.equal(view.meta, "Rilis");
    assert.equal(view.href, "/music/cinta-terbuang");
  });

  it("uses the cover path once the owner uploads artwork", () => {
    const release = releases[0];
    assert.ok(release);
    const view = fromStaticRelease(release, "/assets/covers/masih-mencintainya-papinka.webp");
    assert.equal(view.coverUrl, "/assets/covers/masih-mencintainya-papinka.webp");
    assert.equal(view.title, "Masih Mencintainya — Papinka");
    // Owner data (2026-10-24): the release is a remix of the Papinka song, published 2025.
    assert.equal(view.meta, "Remix · 2025");
  });

  it("marks the era of a DJ Akbar Remix release without inventing a year", () => {
    const release = releases.find((item) => item.slug === "hitungan-cinta-breakbeat-super-exc");
    assert.ok(release);
    assert.equal(releaseEyebrow(release), "Era DJ Akbar Remix");
    assert.equal(release.year, undefined);
  });

  it("keeps a year but no type where the owner's two sources disagree", () => {
    const release = releases.find((item) => item.slug === "dj-rantau-den-panjauah");
    assert.ok(release);
    assert.equal(release.year, 2024);
    assert.equal(release.type, undefined, "one file calls it a remix, the other an original");
    assert.equal(releaseEyebrow(release), "2024");
  });

  it("never invents a listening link", () => {
    for (const release of releases) {
      for (const link of release.links) {
        assert.match(link.href, /^https:\/\//, `${release.slug}: ${link.href}`);
      }
    }
  });

  it("shows a Studio record's verified date only when it is verified", () => {
    const unverified = fromReleaseDocument("cinta-terbuang", doc, null);
    assert.equal(unverified.meta, "Rilis");
    assert.equal(unverified.managed, true);

    const verified = fromReleaseDocument(
      "cinta-terbuang",
      { ...doc, type: "remix", releaseDate: "2025-04-02", dateVerified: true },
      null,
    );
    assert.equal(verified.meta, "Remix · 2025-04-02");

    const hiddenDate = fromReleaseDocument(
      "cinta-terbuang",
      { ...doc, releaseDate: "2025-04-02", dateVerified: false },
      null,
    );
    assert.equal(hiddenDate.meta, "Rilis");
  });
});
