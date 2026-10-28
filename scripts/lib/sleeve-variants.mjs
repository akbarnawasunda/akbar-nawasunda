/**
 * The sleeve series' decision rules — pure, importable, no side effects.
 *
 * These live apart from `scripts/generate-placeholder-covers.mjs` because that script renders, writes
 * files and configures fontconfig the moment it is loaded; a test that wants to ask "which variant
 * would this release get, and is that stable?" must be able to import the rule without generating
 * anything. Everything here is a function of its arguments: no clock, no randomness, no environment.
 */

/** FNV-1a over the slug. The same slug gives the same number on any machine. */
export function seedFor(slug) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < slug.length; i += 1) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** Tie-break order when two variants are equally scarce. Monogram Crop first: it is the loudest. */
export const VARIANT_ORDER = ["monogram-crop", "minimal-frame", "typographic-heavy"];

export const VARIANT_LABEL = {
  "monogram-crop": "Monogram Crop",
  "typographic-heavy": "Typographic Heavy",
  "minimal-frame": "Minimal Frame",
};

/**
 * Assign a variant to every release in a catalogue.
 *
 * Deterministic, from the release's own verified data first and a stable hash second — never
 * randomness, never a hand-written per-slug table:
 *
 *   - a remix, or an interpretation of someone else's song  -> Typographic Heavy (a bootleg: the
 *     title IS the artwork);
 *   - a declared single / EP / album                        -> Minimal Frame (a catalogue release:
 *     restraint, negative space);
 *   - no type confirmed by the owner                        -> whichever variant is currently
 *     scarcest, walked in slug-hash order                  (a club tool/dubplate, and the rule that
 *     keeps the wall from printing the same sheet five times).
 *
 * That last rule needs a word, because it is the one an eye can question. Five of the ten releases
 * have no confirmed type. Sending them all to Monogram Crop — the literal reading of "untyped = club
 * tool" — put five near-identical sheets on the wall, which is the bug this step exists to fix.
 * Sending them by `hash % 3` was tried and was worse: the five hashes all landed in one bucket, so
 * one variant never appeared at all. Walking them in hash order and giving each to the scarcest
 * variant keeps the hash in charge of *which release goes where* (change the slugs and the order
 * changes) while the counts stay even (4 / 3 / 3 on today's catalogue).
 */
export function assignVariants(list) {
  const assigned = new Map();
  const counts = { "monogram-crop": 0, "typographic-heavy": 0, "minimal-frame": 0 };

  for (const release of list) {
    if (release.type === "remix" || release.source) {
      assigned.set(release.slug, "typographic-heavy");
      counts["typographic-heavy"] += 1;
    } else if (release.type) {
      assigned.set(release.slug, "minimal-frame");
      counts["minimal-frame"] += 1;
    }
  }

  const pending = list
    .filter((release) => !assigned.has(release.slug))
    .map((release) => ({ slug: release.slug, key: seedFor(release.slug) }))
    .sort((a, b) => a.key - b.key || a.slug.localeCompare(b.slug));

  for (const { slug } of pending) {
    const scarcest = VARIANT_ORDER.reduce((best, name) => (counts[name] < counts[best] ? name : best), VARIANT_ORDER[0]);
    assigned.set(slug, scarcest);
    counts[scarcest] += 1;
  }

  return assigned;
}

/**
 * A release's position among the releases that share its variant.
 *
 * Composition is keyed on this rank, not on the raw hash: two slugs whose hashes collide can
 * therefore never produce the same drawing (which is exactly what happened —
 * `cinta-terbuang` and `hitungan-cinta-breakbeat-super-exc` came out byte-identical). Rank is stable
 * because the release order is stable, and it renumbers the artwork when the owner reorders the
 * catalogue — the same rule the "RILIS n / 10" line already follows.
 */
export function rankWithinVariant(list) {
  const seen = new Map();
  const ranks = new Map();
  for (const release of list) {
    const variant = assignVariants(list).get(release.slug);
    const rank = seen.get(variant) ?? 0;
    ranks.set(release.slug, rank);
    seen.set(variant, rank + 1);
  }
  return ranks;
}
