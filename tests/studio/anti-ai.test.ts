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
   * The canvas rule's history, because it has now flipped twice and each flip was the owner's:
   * round 3 (D-095) allowed exactly one canvas for the mark; round 20 retired it ("jangan 3D berat
   * jir") and the monogram became a baked WebP still; round 29 is an absolute spec for a *liquid
   * shader* monogram — a 2D quad, no 3D objects, lazily mounted, `frameloop` off when the band
   * scrolls away. So the rule is again "exactly one canvas, in exactly one file": the lazy
   * `AnMonogramLiquid` chunk. Anywhere else a `<canvas>` appears is how the particle field
   * returned last time, and stays banned.
   */
  const LIQUID_CHUNK = "src/components/three/AnMonogramLiquid.tsx";

  it("ships exactly one canvas surface: the lazy liquid-monogram chunk", () => {
    const offenders = globSync("src/{app,components}/**/*.tsx", { cwd: root }).filter(
      (file) => file !== LIQUID_CHUNK && /<canvas/i.test(readFileSync(join(root, file), "utf8")),
    );
    assert.deepEqual(offenders, [], `these files render a <canvas>: ${offenders.join(", ")}`);
    assert.ok(
      /<Canvas/.test(readFileSync(join(root, LIQUID_CHUNK), "utf8")),
      "the liquid chunk no longer renders its Canvas",
    );
  });

  /**
   * Round 29 sanctions three/@react-three/fiber for the liquid monogram and nothing else: the
   * chunk that imports them must be the lazy one, the orchestrator must mount it through
   * `React.lazy` (so `check:web`'s budget never sees it), the baked still must stay in the DOM as
   * the fallback, the owner's "no rigid 3D" rules out extruded/box geometry, and drei/babylon/gsap
   * stay banned outright — a dependency that arrives "just for the signal" is how this started.
   */
  it("keeps the 3D stack quarantined in the lazy liquid chunk, with no rigid geometry", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const name of ["@react-three/drei", "babylonjs", "gsap"]) {
      assert.equal(all[name], undefined, `${name} is installed again`);
    }

    const importers = globSync("src/**/*.{ts,tsx}", { cwd: root }).filter((file) =>
      /from\s+"(three|@react-three\/fiber)|import\(\s*"(three|@react-three\/fiber)/.test(
        readFileSync(join(root, file), "utf8"),
      ),
    );
    assert.deepEqual(importers, [LIQUID_CHUNK], `these files import the 3D stack: ${importers.join(", ")}`);

    const orchestrator = readFileSync(join(root, "src/components/three/AnMonogram.tsx"), "utf8");
    assert.match(orchestrator, /lazy\(\(\) => import\("\.\/AnMonogramLiquid"\)\)/, "the chunk is not lazily imported");
    assert.match(orchestrator, /loading="lazy"/, "the baked still fallback is gone");

    const chunk = readFileSync(join(root, LIQUID_CHUNK), "utf8");
    for (const rigid of [/BoxGeometry/, /ExtrudeGeometry/, /TextGeometry/, /TubeGeometry/]) {
      assert.ok(!rigid.test(chunk), `${rigid.source}: the owner's spec is a shader quad, not rigid 3D`);
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
