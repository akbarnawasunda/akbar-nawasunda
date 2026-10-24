#!/usr/bin/env node
/**
 * Visual review, on Playwright, committed to the repository.
 *
 *   npm run review:shots                 # writes docs/08-IMPLEMENTATION/design-review/round<N>/*.png
 *   npm run review:shots -- --out /tmp/x # somewhere else
 *   npm run review:shots -- --base http://127.0.0.1:3100
 *
 * Why this file exists: every visual decision on this site was made by looking at it in a real
 * browser, but the scripts that did the looking lived in /tmp and the dependency lived in a global
 * install — so the repository could not show that the review happened, and nobody else could repeat
 * it. A screenshot tool you cannot re-run is an opinion, not a test.
 *
 * It drives `playwright-cli` (Microsoft's Playwright CLI, `npm i -g @playwright/cli`) rather than
 * bundling a browser download, because the review machine already has one and the site's own CI
 * (`scripts/a11y-audit.mjs`) uses puppeteer-core for the same reason: no 300 MB download in a
 * pipeline that runs on every push.
 *
 * Prerequisites, both real:
 * - a production build being served (`npm run build && npm run start`);
 * - `playwright-cli` on PATH, and a Chromium it can launch. On a bare Linux CI image Playwright's
 *   Chromium needs system libraries; this repo's notes in TOOLING.md §3 cover the NSS workaround.
 *
 * Every shot waits for the page to settle the same way a reader would: fonts ready, the intro
 * curtain skipped, the smooth-scroll layer finished. Shots that skip that wait are the reason an
 * earlier review round was read as "no motion" when the motion was mid-flight.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const base = argValue("--base", process.env.REVIEW_BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const round = argValue("--round", "round8");
const out = argValue("--out", join("docs", "08-IMPLEMENTATION", "design-review", round));
const work = mkdtempSync(join(tmpdir(), "an-review-"));
mkdirSync(out, { recursive: true });

/** Named reviews: one page state each, all of them claims the design makes. */
const SHOTS = [
  /* R8: the title sequence, on a tab that has never seen it. */
  { name: "01-home-loader-1280", route: "/", width: 1280, height: 900, curtain: true, wait: 700 },
  { name: "02-home-hero-1280", route: "/", width: 1280, height: 900 },
  { name: "03-home-hero-3d-1280", route: "/", width: 1280, height: 900, pointer: [1080, 760] },
  { name: "04-home-ticker-1280", route: "/", width: 1280, height: 900, selector: "[data-ticker]" },
  { name: "05-home-release-1280", route: "/", width: 1280, height: 900, selector: "#music" },
  { name: "06-home-index-hover-1280", route: "/", width: 1280, height: 900, selector: "[class*='indexBand']", hover: "[data-index-row]" },
  { name: "07-home-night-1280", route: "/", width: 1280, height: 900, selector: "[class*='night']" },
  { name: "08-music-1280", route: "/music", width: 1280, height: 900 },
  { name: "09-music-wall-hover-1280", route: "/music", width: 1280, height: 900, scroll: 320, hover: "[data-wall-card]" },
  { name: "10-visuals-1280", route: "/visuals", width: 1280, height: 900 },
  { name: "11-artist-1280", route: "/artist", width: 1280, height: 1000 },
  { name: "12-contact-1280", route: "/contact", width: 1280, height: 900 },
  { name: "13-epk-1280", route: "/epk", width: 1280, height: 900 },
  { name: "14-home-390", route: "/", width: 390, height: 844 },
  { name: "15-music-390", route: "/music", width: 390, height: 844 },
  { name: "16-home-footer-1280", route: "/", width: 1280, height: 900, bottom: true },
  { name: "17-release-1280", route: "/music/masih-mencintainya-papinka", width: 1280, height: 900, pointer: [1040, 520] },
  { name: "18-release-390", route: "/music/masih-mencintainya-papinka", width: 390, height: 844 },
  { name: "19-phone-menu-390", route: "/", width: 390, height: 844, menu: true },
];

const script = `
async page => {
  const shots = ${JSON.stringify(SHOTS)};
  const settle = async () => {
    await page.evaluate(async () => {
      await document.fonts.ready;
      let last = -1;
      for (let i = 0; i < 120; i += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (Math.abs(window.scrollY - last) < 1) return;
        last = window.scrollY;
      }
    });
    await page.waitForTimeout(700);
  };

  const written = [];
  for (const shot of shots) {
    await page.setViewportSize({ width: shot.width, height: shot.height });
    if (shot.curtain) {
      // A tab that has never seen the sequence: no sessionStorage flag, no reload, no settling —
      // the point of this shot is the sequence itself.
      await page.goto('${base}' + shot.route, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(shot.wait ?? 600);
      const loadingPath = ${JSON.stringify(work)} + '/' + shot.name + '.png';
      await page.screenshot({ path: loadingPath });
      written.push(loadingPath);
      continue;
    }

    await page.goto('${base}' + shot.route, { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => sessionStorage.setItem('an-curtain', '1'));
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(500);
    await page.mouse.move(1, 1);

    if (shot.pointer) {
      // Park the pointer in a corner of the object so the plate is visibly turned.
      await page.mouse.move(shot.pointer[0], shot.pointer[1], { steps: 10 });
      await page.waitForTimeout(400);
    }

    if (shot.selector) {
      await page.evaluate((selector) => {
        const node = document.querySelector(selector);
        if (node) window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY - 40);
      }, shot.selector);
    } else if (shot.bottom) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    } else if (shot.scroll) {
      await page.evaluate((y) => window.scrollTo(0, y), shot.scroll);
    } else {
      await page.evaluate(() => window.scrollTo(0, 0));
    }

    if (shot.offset) {
      await page.evaluate((y) => window.scrollTo(0, y), shot.offset);
    }

    await settle();

    if (shot.menu) {
      // The phone drawer is a state, not a route: open it the way a thumb would.
      const toggle = await page.$('button[aria-expanded="false"]');
      if (toggle) {
        await toggle.click();
        await page.waitForTimeout(700);
      }
    }

    if (shot.hover) {
      const target = await page.$(shot.hover);
      if (target) {
        await target.hover();
        await page.waitForTimeout(500);
      }
    }

    const path = ${JSON.stringify(work)} + '/' + shot.name + '.png';
    await page.screenshot({ path });
    written.push(path);
  }
  return written.join('\\n');
}
`;

const scriptPath = join(work, "review.js");
writeFileSync(scriptPath, script, "utf8");

console.log(`reviewing ${SHOTS.length} states against ${base}`);
try {
  execFileSync("playwright-cli", ["run-code", "--filename", scriptPath], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
    timeout: 600000,
  });
} catch (error) {
  console.error("\nplaywright-cli failed. Is the production server up, and is playwright-cli installed?");
  console.error(String(error.message ?? error).split("\n").slice(0, 6).join("\n"));
  process.exitCode = 1;
}

if (!existsSync(work)) process.exit(1);

const pngs = readdirSync(work).filter((file) => file.endsWith(".png"));
for (const file of pngs) copyFileSync(join(work, file), join(out, file));
rmSync(work, { recursive: true, force: true });

console.log(`\n${pngs.length} screenshot(s) written to ${out}`);
if (pngs.length !== SHOTS.length) {
  console.warn(`WARNING: expected ${SHOTS.length}. A failed navigation usually means the route 404s.`);
  process.exitCode = 1;
}
