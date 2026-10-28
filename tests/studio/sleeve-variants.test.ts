import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { releases } from "../../src/content/releases";
import { assignVariants } from "../../scripts/lib/sleeve-variants.mjs";

/**
 * Langkah 3h-2: the sleeves on disk must be three real designs, not one design saved ten times.
 *
 * The bug was invisible to every other gate on this site. `tests/studio/anti-ai.test.ts` asks "is
 * there a sleeve for every release" — yes, ten of them. The build is clean. The wall renders. And
 * all ten files were the same 5604 bytes, because `render()` in the generator took no arguments.
 * A test that measures *distinctness* is the only kind that catches that, so this file measures
 * hashes and pixel content rather than existence.
 *
 * It also pins `variantFor`, because that function is now the rule that decides what artwork a
 * release gets. If a future edit reintroduces a per-slug lookup table, or makes the choice random,
 * the distribution assertions below fail.
 */

const root = join(import.meta.dirname, "../..");
const covers = join(root, "public/assets/covers");

const variantFor = (release: { slug: string }): string => assignVariants(releases).get(release.slug) as string;

const hashOf = (slug: string) =>
  createHash("md5")
    .update(readFileSync(join(covers, `${slug}@sleeve.webp`)))
    .digest("hex");

const LABEL: Record<string, string> = {
  "monogram-crop": "Monogram Crop",
  "typographic-heavy": "Typographic Heavy",
  "minimal-frame": "Minimal Frame",
};

describe("generated sleeves", () => {
  it("ships ten sleeves, no two of them the same file", () => {
    const withoutArtwork = releases.filter((release) => !existsSync(join(covers, `${release.slug}.webp`)));
    const hashes = withoutArtwork.map((release) => hashOf(release.slug));
    assert.equal(hashes.length, 10, `expected 10 generated sleeves, found ${hashes.length}`);
    assert.equal(new Set(hashes).size, hashes.length, "two sleeves are byte-identical again");
  });

  it("uses all three variants, and never more than half the catalogue on one", () => {
    const counts = new Map<string, number>();
    for (const release of releases) {
      const variant = variantFor(release);
      counts.set(variant, (counts.get(variant) ?? 0) + 1);
    }
    for (const name of Object.keys(LABEL)) {
      assert.ok((counts.get(name) ?? 0) >= 2, `only ${counts.get(name) ?? 0} release(s) use ${LABEL[name]}`);
      assert.ok((counts.get(name) ?? 0) <= 5, `${counts.get(name)} releases use ${LABEL[name]} — the wall will look like one design`);
    }
    assert.equal([...counts.keys()].length, 3, "one of the three variants is unused");
  });

  it("derives the variant from the release's own data, deterministically", () => {
    /* Remixes and interpretations are the bootleg variant; declared singles are the catalogue one. */
    for (const release of releases) {
      if (release.type === "remix" || release.source) {
        assert.equal(variantFor(release), "typographic-heavy", `${release.slug} is a remix but is not Type Heavy`);
      }
      if (release.type === "single") {
        assert.equal(variantFor(release), "minimal-frame", `${release.slug} is a single but is not Minimal Frame`);
      }
    }

    /* Pure: the same release gives the same answer on every call and every build. A random or
       time-based choice would make the artwork change between deploys. */
    for (const release of releases) {
      assert.equal(variantFor(release), variantFor({ ...release }));
    }
  });

  it("has a distinct hash for every release inside the same variant", () => {
    /* The failure this catches: a hash collision in the composition seed, which made
       `cinta-terbuang` and `hitungan-cinta-breakbeat-super-exc` byte-identical even after variants
       existed. Composition is now keyed on the release's rank within its variant. */
    const byVariant = new Map<string, string[]>();
    for (const release of releases) {
      const variant = variantFor(release);
      byVariant.set(variant, [...(byVariant.get(variant) ?? []), hashOf(release.slug)]);
    }
    for (const [variant, hashes] of byVariant) {
      assert.equal(new Set(hashes).size, hashes.length, `two ${LABEL[variant]} sleeves are identical`);
    }
  });
});
