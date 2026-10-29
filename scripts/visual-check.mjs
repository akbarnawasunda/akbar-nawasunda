#!/usr/bin/env node
/**
 * Visual check — screenshots + axe-core + console-error capture, in a real Chromium.
 *
 *   npm run visual:setup                                  # one-time browser unpack (see README note)
 *   npm run visual:check -- --category baseline
 *   npm run visual:check -- --category hero --routes / --widths 1440,390
 *
 * Why this file exists: every claim about the site looking right has to be reproducible by someone
 * else, on a machine that is not the one it was written on. A screenshot you cannot re-run is an
 * opinion, not a test. It answers three questions with numbers:
 *
 *   1. does the page render a PNG at all (>0 bytes, valid PNG signature, expected pixel size)?
 *   2. does axe-core find a violation a human would have to be told about?
 *   3. does the browser log a console error / page error / failed request?
 *
 * It drives `playwright-core` + the Chromium that `scripts/setup-visual-tools.sh` unpacks, because
 * this sandbox cannot reach cdn.playwright.dev and cannot apt-install libnss3. The system libraries
 * come from the same npm tarball and ride in on LD_LIBRARY_PATH.
 *
 * Output: artifacts/visual-check/<category>/<page>-<width>.png (and -full.png with --full), plus
 * report.json next to them. artifacts/ is gitignored; force-add a single file when it must survive.
 *
 * Exit code: 1 on any console/page/request error, any axe violation, or any invalid PNG.
 * Use --allow-console-errors to record errors without failing (baseline measurement).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/* ------------------------------------------------------------------ args */
const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
function value(flag, fallback) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

const base = value("--base", process.env.VISUAL_BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const category = value("--category", "baseline");
const outRoot = value("--out", join(process.cwd(), "artifacts", "visual-check"));
const routes = value(
  "--routes",
  "/,/music,/music/masih-mencintainya-papinka,/artist,/visuals,/contact,/epk",
).split(",").map((route) => route.trim()).filter(Boolean);
const widths = value("--widths", "1440,390").split(",").map(Number);
const heights = { 1440: 900, 390: 844 };
const settleMs = Number(value("--settle", "1200"));
const fullPage = has("--full");
const allowConsoleErrors = has("--allow-console-errors");
const runAxe = !has("--no-axe");

const outDir = join(outRoot, category);
mkdirSync(outDir, { recursive: true });

/* ------------------------------------------------------- browser binary */
const revision = (() => {
  const browsers = JSON.parse(readFileSync(join(process.cwd(), "node_modules/playwright-core/browsers.json"), "utf8"));
  return String(browsers.browsers.find((entry) => entry.name === "chromium").revision);
})();
const cache = process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(homedir(), ".cache", "ms-playwright");
const executablePath = join(cache, `chromium-${revision}`, "chrome-linux64", "chrome");
const systemLibs = join(cache, "system-libs");

if (!existsSync(executablePath)) {
  console.error(`✗ no Chromium at ${executablePath}\n  run: bash scripts/setup-visual-tools.sh`);
  process.exit(1);
}

const { chromium } = require("playwright-core");

const launch = () =>
  chromium.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--use-gl=swiftshader",
      "--enable-unsafe-swiftshader",
      "--hide-scrollbars",
    ],
    env: {
      ...process.env,
      LD_LIBRARY_PATH: `${systemLibs}:${process.env.LD_LIBRARY_PATH ?? ""}`,
    },
  });

/* ------------------------------------------------------------------ png */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Signature + IHDR dimensions, straight from the bytes. No image library, no assumptions. */
function inspectPng(path) {
  if (!existsSync(path)) return { ok: false, reason: "missing" };
  const buffer = readFileSync(path);
  if (buffer.length === 0) return { ok: false, reason: "0 bytes" };
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return { ok: false, reason: "bad PNG signature" };
  // IHDR is always the first chunk: 8 signature + 4 length + 4 type + 8 data
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { ok: true, bytes: buffer.length, width, height };
}

/* ---------------------------------------------------------------- axe */
const axeSource = runAxe
  ? readFileSync(require.resolve("axe-core/axe.min.js"), "utf8")
  : null;

/* -------------------------------------------------------------- helpers */
const slugify = (route) => (route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "-"));

async function snap(browser, route, width) {
  const height = heights[width] ?? 900;
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  // Skip the entry reel deterministically: the curtain plays once per session and removes itself.
  await context.addInitScript(() => {
    try {
      window.sessionStorage.setItem("an-curtain", "1");
    } catch {
      /* private mode — the curtain just plays, the settle wait covers it */
    }
  });

  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const requestErrors = [];

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("requestfailed", (request) => {
    // A cancelled request during navigation is not a defect; record the real failures.
    const failure = request.failure()?.errorText ?? "unknown";
    if (failure.includes("ERR_ABORTED")) return;
    requestErrors.push(`${request.url()} — ${failure}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) requestErrors.push(`${response.url()} — HTTP ${response.status()}`);
  });

  const started = Date.now();
  const response = await page.goto(`${base}${route}`, { waitUntil: "load", timeout: 60_000 });
  const status = response?.status() ?? 0;

  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(settleMs);

  const name = `${slugify(route)}-${width}`;
  const file = join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const shot = inspectPng(file);

  let full = null;
  if (fullPage) {
    const fullFile = join(outDir, `${name}-full.png`);
    await page.screenshot({ path: fullFile, fullPage: true });
    full = { file: fullFile, ...inspectPng(fullFile) };
  }

  let axe = null;
  if (runAxe) {
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(async () => {
      const outcome = await window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
        resultTypes: ["violations"],
      });
      return {
        violations: outcome.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.length,
          help: violation.help,
          targets: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
        })),
        incomplete: outcome.incomplete.length,
        passes: outcome.passes.length,
      };
    });
    axe = result;
  }

  await context.close();

  return {
    route,
    width,
    height,
    status,
    elapsedMs: Date.now() - started,
    png: shot,
    fullPng: full,
    consoleErrors,
    pageErrors,
    requestErrors,
    axe,
  };
}

/* ------------------------------------------------------------- self test */
/**
 * Proves the three listeners work, so a "0 errors" run means "none happened" and not "nothing was
 * wired up". Loads a throwaway document, then fires one console error, one uncaught exception and
 * one failed request on purpose and checks each counter moved.
 */
async function selfTest(browser) {
  const context = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const page = await context.newPage();
  const seen = { console: 0, page: 0, request: 0 };
  page.on("console", (message) => message.type() === "error" && seen.console++);
  page.on("pageerror", () => seen.page++);
  page.on("requestfailed", () => seen.request++);

  await page.route("**/deliberate-miss.css", (route) => route.abort("failed"));
  await page.setContent(
    `<!doctype html><html><head><link rel="stylesheet" href="https://self-test.invalid/deliberate-miss.css"></head><body><script>
       console.error("self-test: console listener");
       setTimeout(() => { throw new Error("self-test: pageerror listener"); }, 0);
     </script></body></html>`,
    { waitUntil: "load" },
  );
  await page.waitForTimeout(600);

  /*
   * And axe has to find something on a page that is deliberately broken: an image with no alt and
   * a button with no accessible name. If this returns 0, the audit is inert and every "0
   * violations" line this script prints is a lie.
   */
  let axeProbe = 0;
  if (runAxe) {
    await page.setContent(
      `<!doctype html><html lang="en"><head><title>self-test</title></head><body>
         <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">
         <button></button>
       </body></html>`,
      { waitUntil: "load" },
    );
    await page.addScriptTag({ content: axeSource });
    axeProbe = await page.evaluate(async () => {
      const outcome = await window.axe.run(document, { resultTypes: ["violations"] });
      return outcome.violations.length;
    });
  }

  await context.close();

  const pass =
    seen.console >= 1 && seen.page >= 1 && seen.request >= 1 && (!runAxe || axeProbe >= 1);
  console.log(
    `${pass ? "✓" : "✗"} self-test: console ${seen.console} · page ${seen.page} · request ${seen.request} · axe ${runAxe ? axeProbe : "off"}`,
  );
  return { pass, axeViolationsOnBrokenPage: axeProbe, ...seen };
}

/* ----------------------------------------------------------------- main */
const browser = await launch();
const results = [];
const selfTestResult = await selfTest(browser);
try {
  for (const route of routes) {
    for (const width of widths) {
      process.stdout.write(`→ ${route} @ ${width}px `);
      try {
        const result = await snap(browser, route, width);
        results.push(result);
        const marks = [
          result.status === 200 ? "200" : `HTTP ${result.status}`,
          result.png.ok ? `${result.png.bytes}B ${result.png.width}x${result.png.height}` : `PNG ${result.png.reason}`,
          `console:${result.consoleErrors.length}`,
          `page:${result.pageErrors.length}`,
          `req:${result.requestErrors.length}`,
          result.axe ? `axe:${result.axe.violations.length}` : "axe:off",
        ];
        console.log(`✓ ${marks.join(" · ")} (${result.elapsedMs}ms)`);
      } catch (error) {
        console.log(`✗ ${error.message}`);
        results.push({ route, width, error: String(error) });
      }
    }
  }
} finally {
  await browser.close();
}

const report = {
  generatedAt: new Date().toISOString(),
  base,
  category,
  revisions: { chromium: revision },
  selfTest: selfTestResult,
  totals: {
    shots: results.length,
    pngInvalid: results.filter((result) => !result.png?.ok).length,
    consoleErrors: results.reduce((sum, result) => sum + (result.consoleErrors?.length ?? 0), 0),
    pageErrors: results.reduce((sum, result) => sum + (result.pageErrors?.length ?? 0), 0),
    requestErrors: results.reduce((sum, result) => sum + (result.requestErrors?.length ?? 0), 0),
    axeViolations: results.reduce((sum, result) => sum + (result.axe?.violations.length ?? 0), 0),
  },
  results,
};
writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));

/* --------------------------------------------------------------- print */
console.log("\n── summary ───────────────────────────────────────────────");
for (const result of results) {
  if (result.error) {
    console.log(`✗ ${result.route} @${result.width}: ${result.error}`);
    continue;
  }
  console.log(`${result.route} @${result.width}: HTTP ${result.status}`);
  if (result.png.ok) {
    console.log(`   png  ${result.png.bytes} bytes · ${result.png.width}x${result.png.height}`);
  } else {
    console.log(`   png  INVALID — ${result.png.reason}`);
  }
  for (const message of result.consoleErrors) console.log(`   console error: ${message.slice(0, 300)}`);
  for (const message of result.pageErrors) console.log(`   page error:    ${message.slice(0, 300)}`);
  for (const message of result.requestErrors) console.log(`   request error: ${message.slice(0, 300)}`);
  for (const violation of result.axe?.violations ?? []) {
    console.log(`   axe ${violation.impact}: ${violation.id} (${violation.nodes} nodes) — ${violation.help}`);
  }
}
console.log("──────────────────────────────────────────────────────────");
console.log(
  `${report.totals.shots} shots · PNG invalid ${report.totals.pngInvalid} · console ${report.totals.consoleErrors} · page ${report.totals.pageErrors} · request ${report.totals.requestErrors} · axe ${report.totals.axeViolations}`,
);
console.log(`report: ${join(outDir, "report.json")}`);

const failed =
  !selfTestResult.pass ||
  report.totals.pngInvalid > 0 ||
  report.totals.pageErrors > 0 ||
  report.totals.requestErrors > 0 ||
  report.totals.axeViolations > 0 ||
  (!allowConsoleErrors && report.totals.consoleErrors > 0) ||
  results.some((result) => result.error || (result.status && result.status !== 200));

process.exit(failed ? 1 : 0);
