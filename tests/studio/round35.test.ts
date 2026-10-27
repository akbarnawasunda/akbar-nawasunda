import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { catalogueFloor, releases } from "../../src/content/releases";

/**
 * Round 35 — the "everything broke at once" round, as regression tests.
 *
 * Every fault fixed here was silent: a cursor layer that ate clicks, a ring left behind by a finger,
 * a shader uniform that became `NaN` and painted nothing, a reveal that never received an
 * intersection and left a section at `opacity: 0`, four releases missing from the catalogue. None of
 * them throw, so none of them are caught by a type check. These assertions are the tripwire.
 */

const root = join(import.meta.dirname, "../..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

/** CSS with its comments removed: a rule retired in round 35 is still *described* in a comment. */
function readCss(path: string): string {
  return read(path).replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("catalogue — the songs are always there", () => {
  it("has a floor that cannot be empty", () => {
    /* The public pages read the Studio first and this list second. If this list is ever emptied, a
       database with no published rows renders a music site with no music — the exact bug the owner
       reported. It is not allowed to be empty. */
    assert.ok(catalogueFloor().length >= 12, `only ${catalogueFloor().length} releases in the floor`);
    assert.equal(catalogueFloor(), releases);
  });

  it("lists every release MusicBrainz knows that the handover files missed", () => {
    const byMb = new Set(releases.map((release) => release.mbid).filter(Boolean));
    const expected = [
      "38ef2ed1-73a6-48be-875d-97a47d29ff6f", // Yang Tak Pernah Usai
      "ce16ef87-d5c0-4774-8ea2-3d6fc1e7e0af", // Satu Hari Cukup
      "66506c98-2e31-4972-826a-c3cf9beabe06", // APT (DJ Akbar Remix)
      "91f276bf-e2e9-490d-ac60-0998bdbd411d", // Die With A Smile × … (DJ Akbar Remix)
    ];
    for (const mbid of expected) assert.ok(byMb.has(mbid), `${mbid} missing from the catalogue`);
  });

  it("keeps slugs and MusicBrainz ids unique, and years honest", () => {
    const slugs = new Set<string>();
    const ids = new Set<string>();
    for (const release of releases) {
      assert.match(release.slug, /^[a-z0-9-]+$/, `${release.slug}: slug must be URL-safe`);
      assert.ok(!slugs.has(release.slug), `${release.slug}: duplicate slug`);
      slugs.add(release.slug);

      if (release.mbid) {
        assert.match(release.mbid, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        assert.ok(!ids.has(release.mbid), `${release.mbid}: duplicate MusicBrainz id`);
        ids.add(release.mbid);
      }

      assert.ok(release.title.trim().length > 0, `${release.slug}: title is required`);
      if (release.year !== undefined) {
        assert.ok(Number.isInteger(release.year) && release.year > 1990 && release.year < 2100);
      }
      for (const link of release.links) {
        assert.match(link.href, /^https:\/\//, `${release.slug}: links must be absolute https`);
      }
    }
  });
});

describe("magnetic cursor — it can never block the hand", () => {
  const css = readCss("src/components/zine/MagneticCursor.module.css");

  it("declares pointer-events: none !important on the layer and on both shapes", () => {
    const layer = css.slice(css.indexOf(".cursor {"), css.indexOf(".cursor[data-hidden"));
    assert.match(layer, /pointer-events:\s*none\s*!important/);

    const shapes = css.slice(css.indexOf(".dot,\n.ring {"), css.indexOf(".dot {"));
    assert.match(shapes, /pointer-events:\s*none\s*!important/);
  });

  it("hands the pointer back on touch input", () => {
    const tsx = read("src/components/zine/MagneticCursor.tsx");
    assert.match(tsx, /event\.pointerType === "touch"/);
    assert.match(tsx, /disarm\(\)/);
    /* `data-cursor` is what hides the native pointer, so disarming has to clear it. */
    assert.match(tsx, /delete document\.documentElement\.dataset\.cursor/);
  });

  it("coalesces pointer moves into one frame", () => {
    const tsx = read("src/components/zine/MagneticCursor.tsx");
    assert.match(tsx, /requestAnimationFrame\(paint\)/);
    assert.match(tsx, /cancelAnimationFrame/);
  });
});

describe("monogram — the logo survives a broken GPU", () => {
  it("keeps the baked still until the shader has painted", () => {
    const css = readCss("src/components/three/AnMonogram.module.css");
    assert.match(css, /\.canvas\[data-shader="on"\] \.still/);
    assert.doesNotMatch(css, /\.canvas\[data-liquid="on"\] \.still\s*\{[^}]*opacity:\s*0/);

    const tsx = read("src/components/three/AnMonogram.tsx");
    assert.match(tsx, /ShaderBoundary/);
    assert.match(tsx, /onReady=/);
    assert.match(tsx, /onLost=/);
  });

  it("initialises every uniform to a finite, neutral value", () => {
    const liquid = read("src/components/three/AnMonogramLiquid.tsx");
    assert.match(liquid, /uMouse: \{ value: new THREE\.Vector2\(0\.5, 0\.5\) \}/);
    assert.match(liquid, /uHover: \{ value: 0 \}/);
    assert.match(liquid, /uTime: \{ value: 0 \}/);
    /* A bare normalize() of a near-zero vector is a NaN, and a NaN fragment paints nothing. */
    assert.doesNotMatch(liquid, /normalize\(toPointer/);
    assert.match(liquid, /max\(dist, 0\.0005\)/);
  });
});

describe("reveal — content can never stay at opacity 0", () => {
  it("uses a forgiving observer and a 400 ms failsafe", () => {
    const tsx = read("src/components/zine/Reveal.tsx");
    assert.match(tsx, /threshold:\s*0\.05/);
    assert.match(tsx, /rootMargin:\s*"50px"/);
    assert.match(tsx, /FAILSAFE_MS = 400/);
    assert.match(tsx, /setTimeout\(reveal, FAILSAFE_MS\)/);
  });
});
