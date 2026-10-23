#!/usr/bin/env node
/**
 * axe-core accessibility audit over the public routes, in a real browser.
 *
 *   npm run a11y                       # http://127.0.0.1:3000, routes below, 390 + 1280
 *   npm run a11y -- --base https://akbarnawasunda.my.id
 *   CHROME_PATH=/path/to/chrome npm run a11y
 *
 * Exits 1 on any violation so it can gate a release. "incomplete" results are printed but do not
 * fail the run: axe marks a check incomplete when it cannot decide automatically (for example
 * colour contrast over a photograph), and those were checked by hand — see the audit doc.
 *
 * Chrome: puppeteer-core ships no browser. Set CHROME_PATH, or let it find the usual suspects.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

import puppeteer from "puppeteer-core";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const base = argValue("--base", process.env.AUDIT_BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const routes = ["/", "/music", "/music/masih-mencintainya-papinka", "/artist", "/visuals", "/epk", "/nope"];
const widths = (argValue("--widths", "390,1280")).split(",").map(Number);

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    try {
      return execFileSync("which", ["google-chrome"], { encoding: "utf8" }).trim();
    } catch {
      throw new Error("No Chrome found. Set CHROME_PATH to a Chrome/Chromium binary.");
    }
  }
  return found;
}

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

let violations = 0;
const summary = [];

for (const width of widths) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: width === 390 ? 844 : 900, deviceScaleFactor: 1 });

  for (const route of routes) {
    await page.goto(`${base}${route}`, { waitUntil: "load", timeout: 60000 });
    // Let fonts and lazy artwork settle so contrast/alt checks see the final page.
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
      window.scrollTo(0, 0);
    });

    await page.evaluate(axeSource);
    const result = await page.evaluate(async () =>
      await axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
      }),
    );

    const label = `${route} @${width}`;
    summary.push({
      label,
      violations: result.violations.length,
      incomplete: result.incomplete.length,
      passes: result.passes.length,
    });

    if (result.violations.length > 0) {
      violations += result.violations.length;
      console.log(`\nFAIL ${label}`);
      for (const violation of result.violations) {
        console.log(`  [${violation.impact}] ${violation.id}: ${violation.help}`);
        for (const node of violation.nodes.slice(0, 3)) console.log(`    ${node.target.join(" ")}`);
      }
    } else {
      console.log(`ok   ${label} — ${result.passes.length} checks passed, ${result.incomplete.length} incomplete`);
    }
  }

  await page.close();
}

await browser.close();

console.log("\naxe-core summary");
for (const row of summary) {
  console.log(`  ${row.label.padEnd(44)} violations ${row.violations}  incomplete ${row.incomplete}`);
}
console.log(`\n${violations} violation(s) across ${summary.length} page loads`);
process.exit(violations === 0 ? 0 : 1);
