#!/usr/bin/env node
/**
 * The copy-voice guard, at the only layer that cannot be argued with: the rendered DOM.
 *
 *   CHROME_PATH=/path/to/chrome node scripts/qa-copy.mjs
 *   npm run qa:copy -- --base http://127.0.0.1:3100
 *
 * `tests/studio/copy-voice.test.ts` reads source literals. That catches a headline written in a
 * component, and it is the guard that runs on every `npm test`. It cannot catch copy that arrives
 * from data — a CMS row, a database record, a release description, a `siteConfig` field typed by
 * someone who skipped the review — because those strings do not exist in the source at all.
 *
 * This script boots a real Chrome against a real build, walks every public route, and reads the text
 * a visitor can actually see: text nodes, plus the attributes that reach a screen reader or a tooltip
 * (`alt`, `aria-label`, `title`, `placeholder`). Two things are asserted:
 *
 *   1. no hype. `BANNED_COPY_TERMS` must not appear anywhere. `OWNER_COPY_ONLY_TERMS` ("perjalanan",
 *      "karya") may appear only inside `[data-copy-origin="owner-verbatim"]` — the artist's own
 *      biography — and that block is checked to be the size of a biography, so the marker cannot
 *      become a place to hide a headline.
 *   2. no empty values. An element whose entire visible text is a dash is a field printed blank; the
 *      site prints `Tidak tercatat` / `Belum terklasifikasi` instead (`src/content/copy.ts`).
 *
 * Exits 1 on any failure so it can gate a release the same way `qa:motion` and `a11y` do.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

import puppeteer from "puppeteer-core";

import {
  BANNED_COPY_TERMS,
  OWNER_COPY_ONLY_TERMS,
  OWNER_COPY_ORIGIN,
  findTerms,
} from "./lib/copy-terms.mjs";

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const base = argValue("--base", process.env.AUDIT_BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  const found = candidates.find((path) => existsSync(path));
  if (found) return found;
  try {
    return execFileSync("which", ["google-chrome"], { encoding: "utf8" }).trim();
  } catch {
    throw new Error("No Chrome found. Set CHROME_PATH to a Chrome/Chromium binary.");
  }
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Every public route, including one release of each kind and the 404. */
const ROUTES = [
  "/",
  "/music",
  "/music/masih-mencintainya-papinka",
  "/music/cinta-terbuang",
  "/music/lali-dalane",
  "/artist",
  "/visuals",
  "/epk",
  "/contact",
  "/nope",
];

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const banned = [];
  const reserved = [];
  const emptyValues = [];
  const markerProblems = [];

  for (const route of ROUTES) {
    await page.goto(`${base}${route}`, { waitUntil: "load", timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);

    /* The back sheet, the release HUD and every Reveal only mount or un-hide after a scroll; a copy
       scan that reads the first fold only would be a scan of half the site. */
    await page.evaluate(async () => {
      const height = document.documentElement.scrollHeight;
      for (let y = 0; y < height; y += 600) {
        window.scrollTo({ top: y, behavior: "instant" });
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    await sleep(500);

    const found = await page.evaluate((ownerOrigin) => {
      const isOwnerCopy = (node) => {
        const element = node.nodeType === 1 ? node : node.parentElement;
        return Boolean(element && element.closest(`[data-copy-origin="${ownerOrigin}"]`));
      };

      const publicText = [];
      const ownerText = [];
      const ownerBlocks = [];

      const walk = (node) => {
        for (const child of node.childNodes) {
          if (child.nodeType === 3) {
            const text = (child.textContent ?? "").trim();
            if (!text) continue;
            (isOwnerCopy(child) ? ownerText : publicText).push(text);
          } else if (child.nodeType === 1) {
            const tag = child.tagName;
            if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") continue;
            walk(child);
          }
        }
      };
      walk(document.body);

      for (const element of document.querySelectorAll(`[data-copy-origin="${ownerOrigin}"]`)) {
        ownerBlocks.push((element.textContent ?? "").replace(/\s+/g, " ").trim());
      }

      /* Attributes that reach a visitor through assistive tech or a tooltip. */
      const attributes = [];
      for (const element of document.querySelectorAll("[alt],[aria-label],[title],[placeholder]")) {
        for (const name of ["alt", "aria-label", "title", "placeholder"]) {
          const value = element.getAttribute(name);
          if (value && value.trim()) attributes.push(value.trim());
        }
      }

      /* A field printed blank: the whole visible text of an element is a dash. */
      const blanks = [];
      for (const element of document.querySelectorAll("dd, td, span, p, li")) {
        const text = (element.textContent ?? "").trim();
        if (text === "—" || text === "--") blanks.push(`${element.tagName}: "${text}"`);
      }

      return { publicText, ownerText, ownerBlocks, attributes, blanks };
    }, OWNER_COPY_ORIGIN);

    /* 1a. hype, in the public voice AND in the owner's block: the hard list has no exemptions. */
    for (const text of [...found.publicText, ...found.ownerText, ...found.attributes]) {
      for (const term of findTerms(text, BANNED_COPY_TERMS)) {
        banned.push(`${route}: "${term}" in "${text.slice(0, 70)}"`);
      }
    }

    /* 1b. the reserved words, in the public voice only. */
    for (const text of [...found.publicText, ...found.attributes]) {
      for (const term of findTerms(text, OWNER_COPY_ONLY_TERMS)) {
        reserved.push(`${route}: "${term}" in "${text.slice(0, 70)}"`);
      }
    }

    /* 1c. the exemption must be a biography, not a hiding place. */
    for (const block of found.ownerBlocks) {
      if (block.length < 200) markerProblems.push(`${route}: owner-copy block is ${block.length} chars`);
      if (!block.includes("Akbar Nawasunda")) markerProblems.push(`${route}: owner-copy block is not the biography`);
    }

    /* 2. no blank fields. */
    for (const blank of found.blanks) emptyValues.push(`${route}: ${blank}`);

    console.log(
      `       ${route.padEnd(30)} text=${found.publicText.length + found.ownerText.length} attrs=${found.attributes.length} owner-blocks=${found.ownerBlocks.length}`,
    );
  }

  check("no hype/marketing vocabulary anywhere a visitor can read it", banned.length === 0, banned.slice(0, 8).join(" · "));
  check(
    "reserved vocabulary stays inside the owner's verbatim biography",
    reserved.length === 0,
    reserved.slice(0, 8).join(" · "),
  );
  check("the owner-copy exemption is a real biography, not a hiding place", markerProblems.length === 0, markerProblems.join(" · "));
  check("no field is printed as a blank placeholder", emptyValues.length === 0, emptyValues.slice(0, 8).join(" · "));

  const failed = results.filter((result) => !result.ok).length;
  console.log(`\n${results.length - failed}/${results.length} copy checks passed`);
  process.exitCode = failed === 0 ? 0 : 1;
} finally {
  await browser.close();
}
