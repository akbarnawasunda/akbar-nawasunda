/**
 * Guards for the round-11 performance work.
 *
 * These are not browser benchmarks — those live in `scripts/perf-audit.mjs` and need a GPU and a
 * real Chrome. What is testable without a browser is the *shape* of the decisions, which is where
 * the cost actually went:
 *
 *   1. the ink plate is quantised, so a pointer move cannot repaint the display type per frame;
 *   2. `will-change` on a plate is scoped to the gesture instead of the lifetime of the page;
 *   3. the hero isolates its own paint, so its per-frame invalidation stays inside the band;
 *   4. the sticky bar carries no `backdrop-filter`, because that blur re-runs under the animating
 *      hero on every frame.
 *
 * A test that only reads source files is a weak test, and these are deliberately narrow: each one
 * fails only if the specific mistake it describes comes back.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { PERF_FLAGS } from "@/components/zine/perf-flags";

import { PLATE_STEPS, platePx, snapPlate } from "../../src/components/print/ink-plate";
import { parsePerfFlags } from "../../src/components/zine/perf-flags";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/**
 * Comments out of the way before asserting. These files explain themselves at length — including
 * naming the very properties the tests forbid — so a check that reads prose instead of declarations
 * fails on the documentation that explains why the declaration is gone.
 */
const declarations = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

test("the ink plate lands on whole pixels for the largest plate shift", () => {
  /* The hero's --ink-shift is 7px, which is what PLATE_STEPS is derived from. */
  for (let i = -100; i <= 100; i += 1) {
    const px = platePx(i / 100, 7);
    assert.equal(px, Math.round(px), `offset ${i / 100} painted at ${px}px, not a whole pixel`);
  }
});

test("a full sweep of the ink plate has fifteen positions, not one per frame", () => {
  /* 60 frames a second over a 4 s gesture is ~240 writes; the plate has 15 states. */
  const states = new Set<number>();
  for (let frame = 0; frame < 240; frame += 1) {
    const eased = -1 + (2 * frame) / 239;
    states.add(snapPlate(eased));
  }
  assert.equal(states.size, 2 * PLATE_STEPS + 1);
});

test("snapping is monotonic, so the plate cannot jitter backwards", () => {
  let previous = snapPlate(-1);
  for (let i = -100; i <= 100; i += 1) {
    const current = snapPlate(i / 100);
    assert.ok(current >= previous, `snapped value went backwards at ${i / 100}`);
    previous = current;
  }
});

test("will-change on a plate is scoped to the gesture, never permanent", () => {
  const css = declarations(read("src/components/zine/Plate3D.module.css"));
  const base = css.match(/\.inner\s*\{[^}]*\}/)?.[0] ?? "";
  assert.ok(base, "`.inner` rule not found in Plate3D.module.css");
  assert.ok(
    !/will-change/.test(base),
    "`.inner` carries will-change unconditionally again — that promotes a viewport-sized layer for the whole session",
  );
  assert.match(
    css,
    /\[data-active="true"\][\s\S]{0,40}\.inner\s*\{[^}]*will-change:\s*transform/,
    "the gesture-scoped will-change rule is missing",
  );
  assert.ok(
    !/hover:\s*none/.test(css),
    "`@media (hover: none)` is back — AGENTS.md rule 4 requires gating on event.pointerType",
  );
});

test("the hero isolates its own paint", () => {
  const css = declarations(read("src/app/(site)/page.module.css"));
  const hero = css.match(/^\.hero\s*\{[^}]*\}/m)?.[0] ?? "";
  assert.ok(hero, "`.hero` rule not found");
  assert.match(hero, /contain:\s*layout paint/, "the hero lost its containment");
  assert.ok(
    !/contain:\s*[^;]*\bsize\b/.test(hero),
    "`contain: size` on the hero would treat the box as empty for intrinsic sizing and flatten a tall phone hero",
  );
});

test("the sticky bar does not blur what is animating underneath it", () => {
  const css = declarations(read("src/components/layout/SiteHeader.module.css"));
  const header = css.match(/^\.header\s*\{[^}]*\}/m)?.[0] ?? "";
  assert.ok(header, "`.header` rule not found");
  assert.ok(
    !/backdrop-filter/.test(header),
    "`backdrop-filter` is back on the sticky bar — it re-blurs the full width on every frame the hero moves",
  );
});

/* ------------------------------------------------------------------ ablation switches */

test("?perf= parses the documented switches, repeatable and comma-separated", () => {
  assert.deepEqual([...parsePerfFlags("?perf=noplate")], ["noplate"]);
  assert.deepEqual([...parsePerfFlags("?perf=noplate,noink")], ["noplate", "noink"]);
  assert.deepEqual([...parsePerfFlags("?perf=noplate&perf=blur")], ["noplate", "blur"]);
  assert.deepEqual([...parsePerfFlags("perf=blur")], ["blur"], "a bare query string should parse too");
});

test("an unknown or misspelled switch measures the baseline, not something else", () => {
  /* The failure mode this prevents: `?perf=nopates` silently doing nothing while the person
     measuring believes the plate is off — and concluding from it that the plate is free. */
  assert.equal(parsePerfFlags("?perf=nopates").size, 0);
  assert.equal(parsePerfFlags("?perf=").size, 0);
  assert.equal(parsePerfFlags("").size, 0);
  assert.deepEqual([...parsePerfFlags("?perf=noplate,typo,noink")], ["noplate", "noink"]);
});

test("the ablation switches are wired where they claim to be", () => {
  const plate = read("src/components/zine/Plate3D.tsx");
  const ink = read("src/components/print/InkPress.tsx");
  assert.match(plate, /perfFlag\("noplate"\)/, "Plate3D does not honour ?perf=noplate");
  assert.match(ink, /perfFlag\("noink"\)/, "InkPress does not honour ?perf=noink");
});

test("the retired nocanvas switch stays retired", () => {
  /*
   * Round 20 baked the monogram into WebP stills and deleted the renderer, so `?perf=nocanvas`
   * lost its subject. The danger this guards is the switch quietly coming back: a flag that reads
   * as "the heavy thing is off" while the heavy thing ships is worse than no flag at all.
   */
  const canvas = read("src/components/effects/AnMonogram.tsx");
  assert.doesNotMatch(canvas, /perfFlag\(/, "AnMonogram reads a perf flag again");
  assert.doesNotMatch(canvas, /<canvas/i, "AnMonogram renders a canvas again");
  assert.ok(!(PERF_FLAGS as readonly string[]).includes("nocanvas"), "nocanvas is back in PERF_FLAGS");
});

test("the header blur only ever comes back behind the switch", () => {
  const css = declarations(read("src/components/layout/SiteHeader.module.css"));
  const hits = [...css.matchAll(/backdrop-filter/g)];
  assert.equal(hits.length, 1, "backdrop-filter is expected exactly once, under the switch");
  const rule = css
    .split("}")
    .find((chunk) => chunk.includes("backdrop-filter")) ?? "";
  assert.match(rule, /html\[data-perf~="blur"\]/, "the blur is not scoped to ?perf=blur");
});

/**
 * FASE 4b, Proposal 1 — the entry stagger is allowed to exist, but only under three conditions that
 * have already been violated once each somewhere in this codebase: it must be off under reduced
 * motion, it must never hide something the reader can already see, and it must stay inside
 * `transform`/`opacity` (no filter, no `will-change`, no new duration token).
 */
test("the entry stagger is transform only and fully off under reduced motion", () => {
  const css = declarations(read("src/components/zine/EntryStagger.module.css"));
  assert.doesNotMatch(css, /opacity/, "the stagger fades text, which drops its contrast mid-transition (a11y gate)");
  assert.match(css, /\[data-stagger-state="armed"\]\)?\s*>\s*\*\s*\{[^}]*translate3d\(0,\s*24px,\s*0\)/, "the armed state does not rise");
  assert.doesNotMatch(css, /filter:|backdrop-filter|box-shadow|will-change/, "the stagger animates something other than transform/opacity");
  assert.doesNotMatch(css, /border-radius|radius-/, "the stagger introduces a radius");

  const reduced = css.split("@media (prefers-reduced-motion: reduce)")[1] ?? "";
  assert.match(reduced, /transform:\s*none/, "reduced motion does not remove the offset");
  assert.match(reduced, /transition:\s*none/, "reduced motion still transitions");
  assert.match(reduced, /transition-delay:\s*0ms/, "reduced motion keeps a stagger delay");

  const component = read("src/components/zine/EntryStagger.tsx");
  assert.match(
    component,
    /if \(window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches\) return;/,
    "the stagger arms even when the reader asked for reduced motion",
  );
  assert.match(
    component,
    /const onScreen = rect\.top < window\.innerHeight \* 0\.92 && rect\.bottom > 0;/,
    "a group that is already on screen is no longer skipped, so the first paint can flash",
  );
});

test("the entry stagger is wired to the five reviewed groups and nowhere else", () => {
  const expected: [string, RegExp][] = [
    ["src/components/content/CataloguePin.tsx", /data-stagger="on"/],
    ["src/components/media/VisualRail.tsx", /data-stagger="on"/],
    ["src/components/content/ReleaseLedger.tsx", /data-stagger="on"/],
    ["src/components/content/PaperAbout.tsx", /<DrawOnView as="ol"[^>]*stagger>/],
    ["src/app/(site)/artist/page.tsx", /data-stagger="on"/],
  ];
  for (const [file, pattern] of expected) {
    assert.match(read(file), pattern, `${file} lost its stagger group`);
  }

  /* One more than the five above means a sixth section was added without a decision. */
  const offenders = [...new Set(
    (read("src/components/content/CataloguePin.tsx") + read("src/components/media/VisualRail.tsx") +
      read("src/components/content/ReleaseLedger.tsx") + read("src/components/content/PaperAbout.tsx") +
      read("src/app/(site)/artist/page.tsx")).match(/data-stagger="on"|stagger>/g) ?? [],
  )];
  assert.equal(offenders.length, 2, "the five groups should spell exactly five anchors");
});
