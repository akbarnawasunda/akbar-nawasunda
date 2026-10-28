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
  /*
   * Round 32: `main` arrived carrying the owner's own reference snippets, `*.example.tsx` —
   * documented sketches of the old particle fields, imported by nothing. They name the banned
   * effects on purpose (that is what a sketch of a removed effect is), so the scan skips files
   * whose name carries `.example.` — and, so the skip can never become a hiding place, the very
   * next assertion fails the suite the moment anything imports one of them.
   */
  const isExample = (file: string) => file.includes(".example.");

  it("has no signal/particle/WebGL component left in the app", () => {
    const files = globSync("src/**/*.{ts,tsx,css}", { cwd: root }).filter((file) => !isExample(file));
    const banned = [/SignalField/, /MusicNotesField/, /liquid-signal/, /HeroSignal/];
    const offenders = files.filter((file) => {
      const body = readFileSync(join(root, file), "utf8");
      return banned.some((pattern) => pattern.test(file) || pattern.test(body));
    });
    assert.deepEqual(offenders, [], `these files still mention the removed effect: ${offenders.join(", ")}`);
    const importers = globSync("src/**/*.{ts,tsx}", { cwd: root }).filter(
      (file) => !isExample(file) && /from ["'][^"']*\.example/.test(readFileSync(join(root, file), "utf8")),
    );
    assert.deepEqual(importers, [], `example sketches must stay unimported: ${importers.join(", ")}`);
  });

  /**
   * The canvas rule's history, because it has now flipped twice and each flip was the owner's:
   * round 3 (D-095) allowed exactly one canvas for the mark; round 20 retired it ("jangan 3D berat
   * jir") and the monogram became a baked WebP still; round 29 is an absolute spec for a *liquid
   * shader* monogram — a 2D quad, no 3D objects, lazily mounted, `frameloop` off when the band
   * scrolls away. So the rule is again "exactly one canvas, in exactly one file": the lazy
   * `AnMonogramFoil` chunk. Anywhere else a `<canvas>` appears is how the particle field
   * returned last time, and stays banned.
   */
  const FOIL_CHUNK = "src/components/three/AnMonogramFoil.tsx";

  it("ships exactly one canvas surface: the lazy foil chunk", () => {
    const offenders = globSync("src/{app,components}/**/*.tsx", { cwd: root }).filter(
      (file) => file !== FOIL_CHUNK && !isExample(file) && /<canvas/i.test(readFileSync(join(root, file), "utf8")),
    );
    assert.deepEqual(offenders, [], `these files render a <canvas>: ${offenders.join(", ")}`);
    assert.ok(
      /<canvas/i.test(readFileSync(join(root, FOIL_CHUNK), "utf8")),
      "the foil chunk no longer renders its canvas",
    );
  });

  /**
   * Round 34 removed the 3D stack entirely. The owner reported the WebGL liquid "gagal, jelek, ada
   * bug"; the diagnosis (artifacts/visual-check/mercury-core/DIAGNOSIS.md) found it never rendered
   * without WebGL, cost 21,312 noise evaluations per frame, and shipped a 973 KB three chunk. The
   * replacement is canvas 2D: the same six AN strokes, monochrome bone fill, one signal-blue edge,
   * one mechanical sweep. No WebGL, no shader, no three, no GPU.
   *
   * These assertions are the contract that keeps it that way: no 3D dependency in the tree, the
   * foil is canvas 2D (not WebGL), the loop is parked off screen, the still fallback survives.
   */
  it("has no 3D stack in the tree — the foil is canvas 2D, not WebGL", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    /* The whole 3D stack is banned, not just babylon and gsap. */
    for (const name of ["three", "@react-three/fiber", "@react-three/drei", "babylonjs", "gsap"]) {
      assert.equal(all[name], undefined, `${name} is installed again`);
    }

    const importers = globSync("src/**/*.{ts,tsx}", { cwd: root }).filter((file) =>
      /from\s+"(three|@react-three\/fiber|@react-three\/drei)|import\(\s*"(three|@react-three\/fiber|@react-three\/drei)/.test(
        readFileSync(join(root, file), "utf8"),
      ),
    );
    assert.deepEqual(importers, [], `these files import the 3D stack: ${importers.join(", ")}`);

    const orchestrator = readFileSync(join(root, "src/components/three/AnMonogram.tsx"), "utf8");
    assert.match(
      orchestrator,
      /dynamic\(\(\) => import\("\.\/AnMonogramFoil"\), \{\s*ssr: false,/,
      "the foil is not lazily imported with ssr disabled",
    );
    assert.match(orchestrator, /loading="lazy"/, "the baked still fallback is gone");

    /* The foil must be canvas 2D — the one marker that separates it from every WebGL renderer. */
    const chunk = readFileSync(join(root, FOIL_CHUNK), "utf8");
    assert.match(chunk, /getContext\("2d"\)/, "the foil is not canvas 2D");
    assert.doesNotMatch(chunk, /getContext\("webgl/, "the foil still uses WebGL");
    assert.doesNotMatch(chunk, /WebGLRenderer/, "the foil still uses a WebGL renderer");
    assert.doesNotMatch(chunk, /simplex|snoise/i, "the foil still uses noise");

    /* The loop must be parked off screen by an IntersectionObserver. */
    assert.match(chunk, /IntersectionObserver/, "the foil is not parked off screen");
    assert.match(chunk, /requestAnimationFrame/, "the foil has no rAF loop");
    assert.match(chunk, /cancelAnimationFrame/, "the foil does not cancel its loop");

    /* The still fallback: the foil signals its first frame so the still can step back. */
    assert.match(chunk, /dataset\.foil/, "the foil does not signal its first frame");

    /* Monochrome bone fill + exactly one signal-blue accent edge. */
    assert.match(chunk, /rgba\(255,\s*255,\s*255/, "the foil is not monochrome bone");
    assert.match(chunk, /rgba\(0,\s*135,\s*255/, "the foil has no signal-blue accent");

    /* Mechanical easing, not organic noise. */
    assert.match(chunk, /Math\.pow\(1 - t,\s*3\)/, "the foil does not use mechanical easing");
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
