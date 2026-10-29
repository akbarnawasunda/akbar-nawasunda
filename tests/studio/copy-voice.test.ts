import assert from "node:assert/strict";
import { globSync } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { OWNER_COPY, UNCLASSIFIED, UNRECORDED } from "../../src/content/copy";
import { artistLongBio } from "../../src/content/artist";
import { releaseEyebrow, releases } from "../../src/content/releases";
import { RELEASE_TYPE_LABELS } from "../../src/studio/releases";
import {
  BANNED_COPY_TERMS,
  BANNED_EMPTY_VALUES,
  OWNER_COPY_ONLY_TERMS,
  OWNER_COPY_ORIGIN,
  findTerms,
} from "../../scripts/lib/copy-terms.mjs";

export { BANNED_COPY_TERMS };

const root = join(import.meta.dirname, "../..");

/**
 * Langkah 3i — the copy voice, as a gate.
 *
 * A design system that only governs colour and spacing is half a design system: the voice is the
 * thing that makes a catalogue page read like a catalogue instead of a landing page. This test is the
 * cheap half of the guard — it reads the source literals that can reach a visitor and fails the
 * suite on a hype word. It is deliberately NOT the only half: `scripts/qa-copy.mjs` renders the real
 * pages in Chrome and asserts the same list against the actual DOM, because a string can reach the
 * screen from somewhere this scan does not look (a CMS field, a database row, a component's default).
 *
 * Two tiers, from `scripts/lib/copy-terms.mjs`:
 *   - `BANNED_COPY_TERMS`      never, anywhere.
 *   - `OWNER_COPY_ONLY_TERMS`  only inside the artist's verbatim biography, marked in the DOM with
 *                              `data-copy-origin="owner-verbatim"`. The biography is the artist's own
 *                              statement; editing it is not a copy pass, it is putting words in
 *                              someone's mouth. This test asserts the exemption is that narrow.
 */

/** Every source file whose string literals can reach a public page. */
function publicCopySources(): string[] {
  return [
    ...globSync("src/app/(site)/**/*.tsx", { cwd: root }),
    ...globSync("src/components/**/*.tsx", { cwd: root }),
    ...globSync("src/content/*.ts", { cwd: root }),
    "src/config/site.ts",
  ].sort();
}

/**
 * Comments are not copy. Both markers below are how a comment is written in these files; stripping
 * them first is what keeps this test about what a visitor reads rather than about what a developer
 * wrote down. It is a blunt strip on purpose — the rendered-DOM guard is the precise one.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/\/\/[^\n"'`]*$/gm, " ");
}

/**
 * Everything in a file that a visitor could read: quoted strings, template literals, and JSX text.
 *
 * The JSX half is not optional. Most of this site's copy is written as JSX text —
 * `<p>Jelajahi katalog</p>` — not as a string literal, and a guard that only reads quotes passes
 * cleanly over the exact sentence it exists to stop. That hole was found by deliberately injecting a
 * banned phrase into `contact/page.tsx`: the rendered-DOM guard caught it, the source scan did not.
 */
function copySegments(source: string): string[] {
  const segments: string[] = [];
  for (const match of source.matchAll(/"((?:[^"\\]|\\.)*)"/g)) segments.push(match[1] ?? "");
  for (const match of source.matchAll(/'([^'\n]{2,})'/g)) segments.push(match[1] ?? "");
  for (const match of source.matchAll(/`((?:[^`\\]|\\.)*)`/g)) segments.push(match[1] ?? "");
  /* JSX text runs: between the closing angle of one tag and the opening angle of the next, with no
     braces (a `{}` is an expression, and its literals are already collected above). */
  for (const match of source.matchAll(/>([^<>{}]+)</g)) {
    const text = (match[1] ?? "").trim();
    if (text) segments.push(text);
  }
  return segments;
}

describe("copy voice — banned vocabulary", () => {
  it("defines a non-empty banned list with no duplicates", () => {
    assert.ok(BANNED_COPY_TERMS.length >= 20, `expected a real list, got ${BANNED_COPY_TERMS.length} terms`);
    assert.equal(new Set(BANNED_COPY_TERMS).size, BANNED_COPY_TERMS.length, "duplicate term in BANNED_COPY_TERMS");
    for (const term of BANNED_COPY_TERMS) {
      assert.equal(term, term.toLowerCase(), `"${term}" must be lower case: matching is case-insensitive`);
    }
  });

  it("finds nothing in the string literals that can reach a public page", () => {
    const offenders: string[] = [];
    for (const file of publicCopySources()) {
      for (const literal of copySegments(stripComments(readFileSync(join(root, file), "utf8")))) {
        for (const term of findTerms(literal, BANNED_COPY_TERMS)) {
          offenders.push(`${file}: "${term}" in "${literal.slice(0, 60)}"`);
        }
      }
    }
    assert.deepEqual(offenders, [], `hype/marketing vocabulary reached public copy:\n${offenders.join("\n")}`);
  });

  /**
   * The two soft words: permitted in the biography, refused everywhere else. Written as a diff
   * against the biography itself rather than a hard-coded allowlist, so if the owner rewrites their
   * own bio the exemption follows it instead of silently permitting the old words forever.
   */
  it("keeps 'perjalanan' and 'karya' inside the owner's biography and nowhere else", () => {
    const bioTerms = findTerms(artistLongBio, OWNER_COPY_ONLY_TERMS);
    assert.deepEqual(
      bioTerms.sort(),
      ["karya", "perjalanan"],
      "the biography no longer uses these words — shrink OWNER_COPY_ONLY_TERMS to what it still needs",
    );

    const offenders: string[] = [];
    for (const file of publicCopySources()) {
      for (const literal of copySegments(stripComments(readFileSync(join(root, file), "utf8")))) {
        if (artistLongBio.includes(literal)) continue;
        for (const term of findTerms(literal, OWNER_COPY_ONLY_TERMS)) {
          offenders.push(`${file}: "${term}" in "${literal.slice(0, 60)}"`);
        }
      }
    }
    assert.deepEqual(offenders, [], `reserved vocabulary used outside the biography:\n${offenders.join("\n")}`);
  });

  it("keeps the DOM marker and the guard's marker the same string", () => {
    assert.equal(OWNER_COPY, OWNER_COPY_ORIGIN, "src/content/copy.ts and scripts/lib/copy-terms.mjs disagree");
  });
});

describe("copy voice — no empty values", () => {
  /**
   * The old renderer printed `{value ?? "—"}`, so three releases shipped a data sheet reading
   * `Jenis —` / `Tahun —`. That is a blank field pretending to be data. Missing facts now print
   * `UNRECORDED`, and the catalogue's unclassified eyebrow prints `UNCLASSIFIED` instead of the bare
   * word "Rilis" (which read as *type: release*).
   */
  it("never falls back to a dash or a null-ish placeholder", () => {
    const offenders: string[] = [];
    for (const file of publicCopySources()) {
      const body = stripComments(readFileSync(join(root, file), "utf8"));
      for (const placeholder of BANNED_EMPTY_VALUES) {
        if (!placeholder) continue;
        const pattern = new RegExp(`\\?\\?\\s*"${placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
        if (pattern.test(body)) offenders.push(`${file}: falls back to "${placeholder}"`);
      }
    }
    assert.deepEqual(offenders, [], `empty-value placeholders:\n${offenders.join("\n")}`);
  });

  it("prints an explicit status instead, and says what it means", () => {
    assert.equal(UNRECORDED, "Tidak tercatat");
    assert.equal(UNCLASSIFIED, "Belum terklasifikasi");

    assert.equal(RELEASE_TYPE_LABELS.unknown, UNCLASSIFIED, "the data sheet's Jenis row regressed to a generic word");

    const unclassified = releases.filter((release) => !release.type && !release.year && !release.era);
    assert.ok(unclassified.length > 0, "the fixture set no longer contains an unclassified release");
    for (const release of unclassified) {
      assert.equal(releaseEyebrow(release), UNCLASSIFIED, `${release.slug}: eyebrow is not the explicit status`);
    }
  });
});
