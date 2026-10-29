import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { coverCandidates } from "../../src/content/covers";
import { UNCLASSIFIED } from "../../src/content/copy";
import { fromReleaseDocument, fromStaticRelease } from "../../src/content/release-view";
import { releaseDescription, releaseEyebrow, releases } from "../../src/content/releases";
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
    /* Langkah 3i: the eyebrow no longer falls back to the bare word "Rilis" — inside a catalogue
       line that read as a *type*, and the PRD counted it as an empty value reaching the public. The
       status now says what is missing. */
    assert.equal(view.meta, UNCLASSIFIED);
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

  it("gives every release its own description, built only from fields that exist", () => {
    // Langkah 3k. The old text was one template for all ten ("<title> — rilis terverifikasi Akbar
    // Nawasunda."), 50-53 characters, identical apart from the title.
    const descriptions = releases.map(releaseDescription);

    assert.equal(new Set(descriptions).size, releases.length, "descriptions must not repeat");
    for (const [index, text] of descriptions.entries()) {
      const slug = releases[index]?.slug ?? "?";
      assert.ok(text.length >= 50 && text.length <= 160, `${slug}: ${text.length} chars — ${text}`);
      assert.ok(!/\bundefined\b|null/.test(text), `${slug} leaked a missing value: ${text}`);
      assert.ok(!text.includes("—  —"), `${slug} has an empty clause: ${text}`);
    }

    // A release with no link never claims to be anywhere: three of the ten have none.
    for (const release of releases.filter((entry) => entry.links.length === 0)) {
      assert.ok(
        !releaseDescription(release).includes("Tersedia di"),
        `${release.slug} has no link but claims availability`,
      );
    }

    // ...and the ones with a link name it.
    for (const release of releases.filter((entry) => entry.links.length > 0)) {
      assert.ok(
        releaseDescription(release).includes("Tersedia di"),
        `${release.slug} has a link but no availability clause`,
      );
    }
  });

  it("shows a Studio record's verified date only when it is verified", () => {
    const unverified = fromReleaseDocument("cinta-terbuang", doc, null);
    assert.equal(unverified.meta, UNCLASSIFIED);
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
    assert.equal(hiddenDate.meta, UNCLASSIFIED);
  });
});
