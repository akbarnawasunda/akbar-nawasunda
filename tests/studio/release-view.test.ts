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
    /* Round 35: MusicBrainz knows this one as a Single first released 2025-05-10, so the eyebrow is
       no longer the fallback word "Rilis" — the catalogue states the verified type and year. */
    assert.equal(view.meta, "Single · 2025");
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

  it("resolves the owner's disagreement from MusicBrainz instead of guessing", () => {
    /*
     * One owner file called this a remix, the other listed it under originals, so round 34 kept the
     * year and left the type empty. Round 35 asks a third party: MusicBrainz files it as a Single
     * with the Remix secondary type (release group 9c0d7ad1-…), which is what the catalogue now says.
     */
    const release = releases.find((item) => item.slug === "dj-rantau-den-panjauah");
    assert.ok(release);
    assert.equal(release.year, 2024);
    assert.equal(release.type, "remix");
    assert.equal(release.mbid, "9c0d7ad1-c678-4ea1-9133-c571feb3ed5f");
    assert.equal(releaseEyebrow(release), "Remix · 2024");
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
