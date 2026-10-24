#!/usr/bin/env node
/**
 * The checks that used to be done by hand before every PR.
 *
 * Run against a *running* production build:
 *   PREVIEW_FRAMING=1 npm run build && npx next start -H 127.0.0.1 -p 3000 &
 *   node scripts/check-web.mjs
 *
 * Three things are enforced, all of them numbers that already exist as promises in
 * docs/04-TECHNICAL-ARCHITECTURE/PERFORMANCE_BUDGET.md:
 *
 * 1. **Weight.** The bytes `/` actually references under /_next/static are gzipped from disk and
 *    compared to the budget. Reading the chunk list from the served HTML (instead of a manifest)
 *    means the number is exactly what a browser downloads, including anything Next inlines.
 * 2. **Links.** Every internal link and image that the pages point at must answer 200. Ten release
 *    pages and fourteen platform links were added by hand this month; a dead one is invisible until
 *    a visitor finds it.
 * 3. **Anchors.** `#music`-style links must land on an element that exists. The header links to
 *    in-page sections, and a renamed section id breaks them silently.
 *
 * External hosts are *reported*, not fetched, by default: Spotify and friends rate-limit CI runners
 * and a red build because a third party was slow teaches nobody anything. `--external` opts in.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const ROOT = new URL("..", import.meta.url).pathname;
const CHECK_EXTERNAL = process.argv.includes("--external");

/** Round-3 budget (PERFORMANCE_BUDGET.md). Raise these only with an entry in DECISION_LOG.md. */
const BUDGET = {
  /** Everything `/` loads before interaction: framework + app chunks + polyfills. */
  jsKb: 250,
  cssKb: 40,
  /** Nothing on the critical path should be a photo. */
  imageKb: 400,
};

/** Chunks that are deliberately lazy are still on disk; the budget is about what `/` references. */
const failures = [];
const notes = [];
const seen = new Map();

const gz = (path) => gzipSync(readFileSync(path)).length;

function diskPath(urlPath) {
  // /_next/static/chunks/x.js -> .next/static/chunks/x.js
  return join(ROOT, ".next", urlPath.replace(/^\/_next\//, ""));
}

async function get(path) {
  if (seen.has(path)) return seen.get(path);
  const response = await fetch(new URL(path, BASE), { redirect: "follow" });
  const body = await response.text();
  const result = { status: response.status, body, headers: response.headers };
  seen.set(path, result);
  return result;
}

// ---------------------------------------------------------------- weight

const home = await get("/");
if (home.status !== 200) {
  failures.push(`/ answered ${home.status} — is \`next start\` running at ${BASE}?`);
}

const scripts = [...home.body.matchAll(/<script[^>]+src="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
const styles = [
  ...home.body.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(\/_next\/static\/[^"]+)"/g),
].map((m) => m[1]);

const sum = (urls) =>
  urls.reduce((total, url) => {
    const path = diskPath(url.split("?")[0]);
    if (!existsSync(path)) {
      failures.push(`HTML references a chunk that is not in the build: ${url}`);
      return total;
    }
    return total + gz(path);
  }, 0);

const jsBytes = sum(scripts);
const cssBytes = sum(styles);
const kb = (bytes) => Math.round((bytes / 1024) * 10) / 10;

console.log("weight of /");
console.log(`  JS  ${kb(jsBytes)} KB gz over ${scripts.length} chunks   (budget ${BUDGET.jsKb} KB)`);
console.log(`  CSS ${kb(cssBytes)} KB gz over ${styles.length} files  (budget ${BUDGET.cssKb} KB)`);

if (kb(jsBytes) > BUDGET.jsKb) failures.push(`initial JS ${kb(jsBytes)} KB exceeds ${BUDGET.jsKb} KB`);
if (kb(cssBytes) > BUDGET.cssKb) failures.push(`CSS ${kb(cssBytes)} KB exceeds ${BUDGET.cssKb} KB`);

/**
 * The lazy 3D chunk must NOT be part of the initial list.
 *
 * Matching on "WebGLRenderer" is wrong: the *component* is in the initial bundle and legitimately
 * contains `new THREE.WebGLRenderer(...)`. `WebGLProgram` is a shader-internal symbol only the three
 * library itself defines, so it is a clean marker for "the 78 KB library shipped eagerly".
 */
const threeChunk = scripts.find((url) => {
  const path = diskPath(url.split("?")[0]);
  return existsSync(path) && readFileSync(path, "utf8").includes("WebGLProgram");
});
if (threeChunk) failures.push(`three is in the initial payload again (${threeChunk}) — it must stay lazy`);

// ---------------------------------------------------------------- links + anchors

const sitemap = await get("/sitemap.xml");
const routes = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => new URL(m[1]).pathname)
  .filter((path, index, all) => all.indexOf(path) === index);

const internal = new Set();
const external = new Set();
const assets = new Set();
const anchors = new Map();

for (const route of routes) {
  const page = await get(route);
  if (page.status !== 200) {
    failures.push(`${route} answered ${page.status}`);
    continue;
  }

  const ids = new Set([...page.body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const pageAnchors = [];

  for (const [, href] of page.body.matchAll(/href="([^"]+)"/g)) {
    const url = new URL(href, BASE);
    if (url.origin !== new URL(BASE).origin) {
      if (url.protocol.startsWith("http")) external.add(url.href);
      continue;
    }
    if (url.hash && url.pathname === route) pageAnchors.push(url.hash.slice(1));
    if (url.pathname.startsWith("/_next/")) continue;
    internal.add(url.pathname);
  }

  anchors.set(route, { ids, wanted: pageAnchors });

  /**
   * Only the `src` and the *smallest* `srcset` candidate are fetched. Two traps here:
   * - the HTML is entity-escaped, so `&amp;` has to be decoded or /_next/image answers 400;
   * - a srcset lists widths up to 3840 for images Next knows are 720 px wide, and the optimizer
   *   correctly rejects those. A browser never asks for them, so neither should this check.
   */
  for (const [, src] of page.body.matchAll(/(?:src|srcSet|srcset)="([^"]+)"/g)) {
    const decoded = src.replaceAll("&amp;", "&");
    const candidate = decoded.split(",")[0].trim().split(/\s+/)[0];
    const url = new URL(candidate, BASE);
    // Keep the query string: /_next/image only answers with ?url=…&w=… .
    if (url.origin === new URL(BASE).origin) assets.add(url.pathname + url.search);
  }
}

const broken = [];
for (const path of [...internal, ...assets]) {
  const response = await fetch(new URL(path, BASE), { redirect: "follow" });
  if (response.status !== 200) broken.push(`${path} → ${response.status}`);
}
if (broken.length) failures.push(...broken.map((entry) => `dead target: ${entry}`));

for (const [route, { ids, wanted }] of anchors) {
  for (const id of new Set(wanted)) {
    if (!ids.has(id)) failures.push(`${route} links to #${id} but no element has that id`);
  }
}

console.log(`links`);
console.log(`  ${routes.length} routes · ${internal.size} internal targets · ${assets.size} media files`);
console.log(`  ${external.size} external links (not fetched${CHECK_EXTERNAL ? " — checking" : "; use --external"})`);

if (CHECK_EXTERNAL) {
  /**
   * Only the *shape* of the link is enforced: HTTPS, a real host, a path that is not a placeholder.
   * Actually requesting them is reported as a note, never a failure — the hosts block CI runners
   * (ECONNRESET from Spotify and Apple within seconds), so treating their answers as truth would
   * either fail every run or pass every run. Verifying a platform ID needs the owner's dashboard,
   * not a HEAD request from a datacentre.
   */
  const PLACEHOLDERS = /\/(example|test|TODO|xxx)|YOUR_|<|>|\s/;
  for (const href of external) {
    const url = new URL(href);
    if (url.protocol !== "https:") failures.push(`external link is not https: ${href}`);
    if (PLACEHOLDERS.test(url.pathname)) failures.push(`external link looks like a placeholder: ${href}`);
    if (url.pathname === "/" && url.hostname !== "akbarnawasunda.my.id") {
      notes.push(`external link points at a bare host: ${href}`);
    }
  }

  for (const href of [...external].slice(0, 40)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(href, { method: "GET", redirect: "follow", signal: controller.signal });
      clearTimeout(timer);
      // 999 is what Spotify and friends return to bots; 403/429 is rate limiting, not a dead link.
      if (response.status >= 400 && ![999, 403, 429].includes(response.status)) {
        notes.push(`external ${href} → ${response.status}`);
      }
    } catch (error) {
      notes.push(`external ${href} → ${error?.name === "AbortError" ? "timed out" : "unreachable from CI"}`);
    }
  }
}

// ---------------------------------------------------------------- report

for (const note of notes) console.log(`  note: ${note}`);

if (failures.length) {
  console.error(`\n✗ ${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("\n✓ weight within budget, every internal link and anchor resolves");
