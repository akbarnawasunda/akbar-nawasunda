import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { globSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import {
  coverArtwork,
  coverArtworkWith,
  coverCandidates,
  resolveCover,
  resolveCoverWith,
  resolveSleeve,
  resolveSleeveWith,
  sleeveCandidate,
  type CoverProbe,
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
   * `AnMonogramLiquid` chunk. Anywhere else a `<canvas>` appears is how the particle field
   * returned last time, and stays banned.
   */
  const LIQUID_CHUNK = "src/components/three/AnMonogramLiquid.tsx";

  it("ships exactly one canvas surface: the lazy liquid-monogram chunk", () => {
    const offenders = globSync("src/{app,components}/**/*.tsx", { cwd: root }).filter(
      (file) => file !== LIQUID_CHUNK && !isExample(file) && /<canvas/i.test(readFileSync(join(root, file), "utf8")),
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
  it("keeps the 3D stack quarantined in the lazy liquid chunk, solid and reflective per spec", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    /* Round 31 sanctions drei (Environment/Lightformer) alongside three and fiber — the owner's
       spec names it. babylon and gsap stay banned outright. */
    for (const name of ["babylonjs", "gsap"]) {
      assert.equal(all[name], undefined, `${name} is installed again`);
    }

    const importers = globSync("src/**/*.{ts,tsx}", { cwd: root }).filter((file) =>
      /from\s+"(three|@react-three\/fiber)|import\(\s*"(three|@react-three\/fiber)/.test(
        readFileSync(join(root, file), "utf8"),
      ),
    );
    assert.deepEqual(importers, [LIQUID_CHUNK], `these files import the 3D stack: ${importers.join(", ")}`);

    const orchestrator = readFileSync(join(root, "src/components/three/AnMonogram.tsx"), "utf8");
    assert.match(
      orchestrator,
      /dynamic\(\(\) => import\("\.\/AnMonogramLiquid"\), \{\s*ssr: false,/,
      "the chunk is not lazily imported with ssr disabled",
    );
    assert.match(orchestrator, /loading="lazy"/, "the baked still fallback is gone");

    /* Round 31 reversed round 29's flat-quad rule: the mark must be SOLID — extruded strokes in a
       mercury physical material, melted in the vertex stage, lit by an in-scene environment that
       fetches nothing. These are the assertions that the object stays an object. */
    const chunk = readFileSync(join(root, LIQUID_CHUNK), "utf8");
    assert.match(chunk, /ExtrudeGeometry/, "the monogram is no longer solid geometry");
    assert.match(chunk, /MeshPhysicalMaterial/, "the mercury material is gone");
    assert.match(chunk, /metalness: 1/, "metalness is not 1");
    assert.match(chunk, /roughness: 0.05/, "roughness is not 0.05");
    assert.match(chunk, /onBeforeCompile/, "the melt no longer runs in the vertex stage");
    assert.match(chunk, /<Environment/, "the drei environment is gone");
    assert.match(chunk, /onPointerMove/, "the raycaster ripple is gone");
    assert.match(chunk, /dpr=\{\[1, 1.5\]\}/, "DPR is not capped at 1.5");
    assert.match(chunk, /frameloop=\{inView \? "always" : "demand"\}/, "the loop is not parked off screen");
    for (const banned of [/BoxGeometry/, /TextGeometry/, /TubeGeometry/]) {
      assert.ok(!banned.test(chunk), `${banned.source}: the spec is extruded strokes, not primitives`);
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

  /**
   * The waterfall takes a probe, not a directory (see the header of src/content/covers.ts): the only
   * `fs` call left in that module is the production one, with a literal path, so Next.js traces one
   * folder instead of the whole repository. Tests keep their own real directory here — the same
   * temp-dir fixture the suite always used — and hand the resolver this closure instead.
   */
  const onDisk = (dir: string): CoverProbe => (publicPath) => existsSync(join(dir, publicPath));

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
    assert.equal(resolveCoverWith("belum-ada", onDisk(publicDir)), null);
  });

  it("falls back to the designed sleeve when nothing has been uploaded", () => {
    assert.deepEqual(coverArtworkWith("belum-ada", onDisk(publicDir)), { kind: "generated" });
  });

  it("prefers an uploaded level-1 webp", () => {
    mkdirSync(join(publicDir, "assets/covers"), { recursive: true });
    writeFileSync(join(publicDir, "assets/covers/masih-mencintainya-papinka.webp"), "fake");
    assert.deepEqual(coverArtworkWith("masih-mencintainya-papinka", onDisk(publicDir)), {
      kind: "image",
      src: "/assets/covers/masih-mencintainya-papinka.webp",
    });
  });

  it("accepts a manual override in another format (level 4)", () => {
    mkdirSync(join(publicDir, "assets/covers"), { recursive: true });
    writeFileSync(join(publicDir, "assets/covers/cinta-terbuang.avif"), "fake");
    assert.deepEqual(coverArtworkWith("cinta-terbuang", onDisk(publicDir)), {
      kind: "image",
      src: "/assets/covers/cinta-terbuang.avif",
    });
  });

  it("serves the generated sleeve as a file, not as a component, when one exists", () => {
    mkdirSync(join(publicDir, "assets/covers"), { recursive: true });
    writeFileSync(join(publicDir, "assets/covers/masih-dihatiku@sleeve.webp"), "fake");
    assert.equal(sleeveCandidate("masih-dihatiku"), "/assets/covers/masih-dihatiku@sleeve.webp");
    assert.equal(
      resolveSleeveWith("masih-dihatiku", onDisk(publicDir)),
      "/assets/covers/masih-dihatiku@sleeve.webp",
    );
    assert.deepEqual(coverArtworkWith("masih-dihatiku", onDisk(publicDir)), {
      kind: "sleeve",
      src: "/assets/covers/masih-dihatiku@sleeve.webp",
    });
  });

  it("prefers real artwork over a generated sleeve", () => {
    mkdirSync(join(publicDir, "assets/covers"), { recursive: true });
    writeFileSync(join(publicDir, "assets/covers/bayang-tanpa-kata@sleeve.webp"), "fake");
    writeFileSync(join(publicDir, "assets/covers/bayang-tanpa-kata.webp"), "real");
    assert.deepEqual(coverArtworkWith("bayang-tanpa-kata", onDisk(publicDir)), {
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

  /*
   * The production probe is the one with a literal `fs` path, and it is the reason the build no
   * longer traces the repository. Pin it against the real directory: if it ever stops answering,
   * every cover on the site silently falls back to a component-drawn sleeve.
   */
  it("resolves real covers from the repo's own public directory", () => {
    const probe = onDisk(join(root, "public"));
    for (const release of releases) {
      assert.equal(
        resolveCoverWith(release.slug, probe),
        resolveCover(release.slug),
        `probe and production disagree for ${release.slug}`,
      );
    }
    assert.equal(resolveCover("masih-mencintainya-papinka"), null);
    assert.equal(
      resolveSleeve("masih-mencintainya-papinka"),
      "/assets/covers/masih-mencintainya-papinka@sleeve.webp",
    );
    /* The two production wrappers above feed this one; assert the composed answer too. */
    assert.deepEqual(coverArtwork("masih-mencintainya-papinka"), {
      kind: "sleeve",
      src: "/assets/covers/masih-mencintainya-papinka@sleeve.webp",
    });
    assert.deepEqual(coverArtworkWith("masih-mencintainya-papinka", probe), coverArtwork("masih-mencintainya-papinka"));
  });

  it("has the directory the owner drops files into", () => {
    assert.ok(existsSync(join(root, "public/assets/covers/README.md")));
  });
});
