import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { globSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import {
  coverArtwork,
  coverCandidates,
  resolveCover,
  resolveSleeve,
  sleeveCandidate,
} from "../../src/content/covers";
import { releases } from "../../src/content/releases";
import { homepageSourceFiles, BANNED_HOMEPAGE_PATTERNS } from "../fixtures/anti-ai";

const root = join(import.meta.dirname, "../..");

/**
 * The anti-AI rules from the final brief, as tests.
 *
 * These are the rules that kept getting quietly undone: a particle field creeps back into the hero,
 * a new dependency arrives "just for the signal", a release tile ships with no artwork. A written
 * checklist in a doc did not stop that; a red test does.
 */

describe("no generated visual effects ship", () => {
  it("has no signal/particle/WebGL component left in the app", () => {
    const files = globSync("src/**/*.{ts,tsx,css}", { cwd: root });
    const banned = [/SignalField/, /MusicNotesField/, /liquid-signal/, /HeroSignal/];
    const offenders = files.filter((file) => {
      const body = readFileSync(join(root, file), "utf8");
      return banned.some((pattern) => pattern.test(file) || pattern.test(body));
    });
    assert.deepEqual(offenders, [], `these files still mention the removed effect: ${offenders.join(", ")}`);
  });

  /**
   * Round 3 (D-095) allows exactly one canvas, for the owner's own mark, and exactly one file that
   * may create it. A single `<canvas>` in the app is what the brief asks for; a second one is how
   * the particle field came back last time, so the rule is written as an allowlist, not a ban.
   */
  const CANVAS_ALLOWLIST = ["src/components/three/AnMonogram.tsx"];

  it("ships at most one canvas, in the monogram component only", () => {
    const offenders = globSync("src/{app,components}/**/*.tsx", { cwd: root }).filter((file) => {
      if (CANVAS_ALLOWLIST.includes(file)) return false;
      return /<canvas/i.test(readFileSync(join(root, file), "utf8"));
    });
    assert.deepEqual(offenders, [], `these files render a <canvas>: ${offenders.join(", ")}`);
  });

  it("allows three for the monogram but never the react-three wrappers", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    assert.ok(all.three, "three is the one renderer the brief allows (D-095)");
    for (const name of ["@react-three/fiber", "@react-three/drei", "gsap"]) {
      assert.equal(all[name], undefined, `${name} is installed again`);
    }
  });

  it("keeps the homepage free of the banned patterns", () => {
    for (const file of homepageSourceFiles()) {
      const body = readFileSync(join(root, file), "utf8");
      for (const { pattern, why } of BANNED_HOMEPAGE_PATTERNS) {
        assert.ok(!pattern.test(body), `${file}: ${why}`);
      }
    }
  });
});

describe("cover artwork waterfall", () => {
  const publicDir = mkdtempSync(join(tmpdir(), "covers-"));
  after(() => rmSync(publicDir, { recursive: true, force: true }));

  it("offers webp first, then the other accepted extensions", () => {
    assert.deepEqual(coverCandidates("cinta-terbuang"), [
      "/assets/covers/cinta-terbuang.webp",
      "/assets/covers/cinta-terbuang.avif",
      "/assets/covers/cinta-terbuang.jpg",
      "/assets/covers/cinta-terbuang.jpeg",
      "/assets/covers/cinta-terbuang.png",
    ]);
  });

  it("returns null when nothing has been uploaded", () => {
    assert.equal(resolveCover("belum-ada", publicDir), null);
  });

  it("falls back to the designed sleeve when nothing has been uploaded", () => {
    assert.deepEqual(coverArtwork("belum-ada", publicDir), { kind: "generated" });
  });

  it("prefers an uploaded level-1 webp", () => {
    mkdirSync(join(publicDir, "assets/covers"), { recursive: true });
    writeFileSync(join(publicDir, "assets/covers/masih-mencintainya-papinka.webp"), "fake");
    assert.deepEqual(coverArtwork("masih-mencintainya-papinka", publicDir), {
      kind: "image",
      src: "/assets/covers/masih-mencintainya-papinka.webp",
    });
  });

  it("accepts a manual override in another format (level 4)", () => {
    mkdirSync(join(publicDir, "assets/covers"), { recursive: true });
    writeFileSync(join(publicDir, "assets/covers/cinta-terbuang.avif"), "fake");
    assert.deepEqual(coverArtwork("cinta-terbuang", publicDir), {
      kind: "image",
      src: "/assets/covers/cinta-terbuang.avif",
    });
  });

  it("serves the generated sleeve as a file, not as a component, when one exists", () => {
    mkdirSync(join(publicDir, "assets/covers"), { recursive: true });
    writeFileSync(join(publicDir, "assets/covers/masih-dihatiku@sleeve.webp"), "fake");
    assert.equal(sleeveCandidate("masih-dihatiku"), "/assets/covers/masih-dihatiku@sleeve.webp");
    assert.equal(resolveSleeve("masih-dihatiku", publicDir), "/assets/covers/masih-dihatiku@sleeve.webp");
    assert.deepEqual(coverArtwork("masih-dihatiku", publicDir), {
      kind: "sleeve",
      src: "/assets/covers/masih-dihatiku@sleeve.webp",
    });
  });

  it("prefers real artwork over a generated sleeve", () => {
    mkdirSync(join(publicDir, "assets/covers"), { recursive: true });
    writeFileSync(join(publicDir, "assets/covers/bayang-tanpa-kata@sleeve.webp"), "fake");
    writeFileSync(join(publicDir, "assets/covers/bayang-tanpa-kata.webp"), "real");
    assert.deepEqual(coverArtwork("bayang-tanpa-kata", publicDir), {
      kind: "image",
      src: "/assets/covers/bayang-tanpa-kata.webp",
    });
  });

  it("has a sleeve on disk for every verified release", () => {
    for (const release of releases) {
      if (resolveCover(release.slug)) continue;
      assert.ok(resolveSleeve(release.slug), `no artwork and no sleeve for ${release.slug}`);
    }
  });

  it("has the directory the owner drops files into", () => {
    assert.ok(existsSync(join(root, "public/assets/covers/README.md")));
  });
});
