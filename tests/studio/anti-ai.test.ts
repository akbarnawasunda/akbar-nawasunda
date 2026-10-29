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
   * The canvas rule's history, because it has flipped three times and every flip was the owner's:
   * round 3 (D-095) allowed exactly one canvas for the mark; round 20 retired it ("jangan 3D berat
   * jir") and the monogram became a baked WebP still; round 29 asked for a *liquid shader*
   * monogram; Langkah 3h-1 retired the shader in turn — the owner's instruction is a Canvas 2D
   * "metalmark foil", no WebGL at all.
   *
   * So the rule is still "exactly one canvas, in exactly one file", and the file is the lazy foil
   * chunk. The second half of the rule is new and is the reason this migration exists: a canvas is
   * a canvas, so the ONE chunk that owns one must be the only chunk that ever asks for a drawing
   * context. Anything else — a second `<canvas>`, a second `getContext(` — is how the particle field
   * came back last time.
   */
  const FOIL_CHUNK = "src/components/effects/AnMonogramFoil.tsx";
  const ORCHESTRATOR = "src/components/effects/AnMonogram.tsx";

  it("ships exactly one canvas surface: the lazy Canvas 2D foil chunk", () => {
    const sources = globSync("src/{app,components}/**/*.{ts,tsx}", { cwd: root }).filter((file) => !isExample(file));
    const offenders = sources.filter(
      (file) => file !== FOIL_CHUNK && /<canvas/i.test(readFileSync(join(root, file), "utf8")),
    );
    assert.deepEqual(offenders, [], `these files render a <canvas>: ${offenders.join(", ")}`);

    const contexts = sources.filter(
      (file) => file !== FOIL_CHUNK && /getContext\(/.test(readFileSync(join(root, file), "utf8")),
    );
    assert.deepEqual(contexts, [], `drawing contexts belong to the foil chunk only: ${contexts.join(", ")}`);

    const chunk = readFileSync(join(root, FOIL_CHUNK), "utf8");
    assert.match(chunk, /<canvas/, "the foil chunk no longer renders its canvas element");
    assert.match(chunk, /getContext\("2d"/, "the foil chunk is not a Canvas 2D renderer");
  });

  /**
   * Langkah 3h-1, the owner's absolute spec: the monogram is a Canvas 2D foil, and three.js /
   * @react-three/* are forbidden — not "quarantined", not "sanctioned for one chunk", gone. Round
   * 29's quarantine is what grew into an extruded mesh, a vertex-stage melt and a drei environment
   * for a mark that was supposed to be a material.
   *
   * The assertions below are therefore the inverse of the ones they replaced: the packages are
   * absent from package.json, nothing in `src` imports them, and the chunk that draws the mark may
   * contain no WebGL vocabulary at all. The orchestrator keeps the same two duties it always had —
   * lazily import the heavy chunk with `ssr: false`, and ship the baked still — because a canvas in
   * the server HTML is a canvas at scroll 0.
   */
  it("keeps the 3D stack out of the tree entirely and the foil chunk 2D-only", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const name of ["three", "@react-three/fiber", "@react-three/drei", "babylonjs", "gsap"]) {
      assert.equal(all[name], undefined, `${name} is installed again`);
    }

    const importers = globSync("src/**/*.{ts,tsx}", { cwd: root }).filter((file) =>
      /from\s+"(three|@react-three\/[a-z]+)"|import\(\s*"(three|@react-three\/[a-z]+)"/.test(
        readFileSync(join(root, file), "utf8"),
      ),
    );
    assert.deepEqual(importers, [], `these files import the 3D stack: ${importers.join(", ")}`);

    const orchestrator = readFileSync(join(root, ORCHESTRATOR), "utf8");
    assert.match(
      orchestrator,
      /dynamic\(\(\) => import\("\.\/AnMonogramFoil"\), \{\s*ssr: false,/,
      "the foil chunk is not lazily imported with ssr disabled",
    );
    assert.match(orchestrator, /loading="lazy"/, "the baked still fallback is gone");

    /* The foil chunk is Canvas 2D and nothing else: no R3F `Canvas`, no three namespace, no WebGL
       probe, no shader. `getContext("2d")` is the only context call allowed to exist in `src`. */
    const chunk = readFileSync(join(root, FOIL_CHUNK), "utf8");
    for (const banned of [/<Canvas/, /\bTHREE\b/, /webgl/i, /ExtrudeGeometry/, /MeshPhysicalMaterial/, /onBeforeCompile/]) {
      assert.ok(!banned.test(chunk), `${banned.source}: the foil is Canvas 2D, not WebGL`);
    }
    assert.match(chunk, /prefers-reduced-motion: reduce/, "reduced motion is not honoured by the foil");
    assert.match(chunk, /Math\.min\(window\.devicePixelRatio \|\| 1, DPR_CAP\)/, "the device pixel ratio is not capped");
    assert.match(chunk, /data-ambient/, "the ≤768px ambient state is not written to the DOM");
  });

  /**
   * The mount gate, in source, because the browser probe is the proof and this is the tripwire.
   *
   * `scripts/qa-motion.mjs` asserts zero canvases at scroll 0 at 1440×900 — and that assertion
   * passed for months while phones failed it, because at ≤899px `.hero` collapses to `height: auto`
   * and the band is 34.7 % visible at scroll 0. Intersection alone could never fix that. The
   * orchestrator therefore requires both intersection AND `scrollY > 1`, and the stylesheet gives
   * the foil its documented mobile resting state.
   */
  it("gates the foil behind an actual scroll instead of mere intersection", () => {
    const orchestrator = readFileSync(join(root, ORCHESTRATOR), "utf8");
    assert.match(orchestrator, /window\.scrollY <= SCROLL_GATE/, "the scroll gate is gone; intersection alone fires in the first fold on phones");
    assert.match(orchestrator, /data-foil-state/, "the mount state is not observable in the DOM");

    const css = readFileSync(join(root, "src/components/effects/AnMonogram.module.css"), "utf8");
    assert.match(css, /\.foil\[data-ambient="true"\][\s\S]*?opacity: 0\.2;/, "the ambient variant is not at opacity .2");
    assert.match(css, /\.foilLayer[\s\S]*?pointer-events: none;|pointer-events: none;/, "the ambient variant still takes pointer events");
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
    /*
     * Both halves of the waterfall, pinned against real files. The 7 releases that carry a
     * published link have their artwork fetched into `public/assets/covers/<slug>.webp`; the 3
     * that carry no link keep the generated sleeve. A slug with a real cover must resolve to it
     * (level 1), and a slug without one must fall through to the sleeve (level 3) rather than
     * returning null — that fall-through is what keeps a coverless release from rendering blank.
     */
    assert.equal(
      resolveCover("masih-mencintainya-papinka"),
      "/assets/covers/masih-mencintainya-papinka.webp",
    );
    assert.equal(resolveCover("cinta-terbuang"), null);
    assert.equal(resolveSleeve("cinta-terbuang"), "/assets/covers/cinta-terbuang@sleeve.webp");
    /* The two production wrappers above feed this one; assert the composed answer too. */
    assert.deepEqual(coverArtwork("masih-mencintainya-papinka"), {
      kind: "image",
      src: "/assets/covers/masih-mencintainya-papinka.webp",
    });
    assert.deepEqual(coverArtwork("cinta-terbuang"), {
      kind: "sleeve",
      src: "/assets/covers/cinta-terbuang@sleeve.webp",
    });
    assert.deepEqual(coverArtworkWith("cinta-terbuang", probe), coverArtwork("cinta-terbuang"));
    assert.deepEqual(
      coverArtworkWith("masih-mencintainya-papinka", probe),
      coverArtwork("masih-mencintainya-papinka"),
    );
  });

  it("has the directory the owner drops files into", () => {
    assert.ok(existsSync(join(root, "public/assets/covers/README.md")));
  });
});
