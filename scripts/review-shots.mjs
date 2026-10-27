#!/usr/bin/env node
/**
 * Review shots — real pixels, from a real browser, written where the site can serve them.
 *
 *   CHROME_PATH=/path/to/chrome node scripts/review-shots.mjs
 *   node scripts/review-shots.mjs --base http://127.0.0.1:3000 --out public/review-shots
 *
 * Why this exists: this sandbox has no Chromium and no apt, so the only honest way to show the owner
 * what the page looks like is to have CI — which already installs Chrome for axe and the motion QA —
 * take the pictures and hand them back as an artifact. The output directory is inside `public/`, so
 * the shots are also served by the site itself at `/review-shots/<file>.png`.
 *
 * What is captured, and why these four:
 *
 *   home-390          the phone hero, viewport-sized: the label, the wordmark, the chrome mark and the
 *                     status deck are the whole first screen, so this is the one that proves the
 *                     asymmetric layout survives a 390px hand.
 *   home-390-full     the whole phone page, top to bottom, at device scale 2.
 *   home-1440         the desktop first screen.
 *   home-1440-full    the whole desktop page.
 *   release-1440      the spotlight band, scrolled into view (a `#release` URL is reset by the scroll
 *   release-390       layer on load, so the anchor is applied after the page has settled).
 *   discography-1440  the ledger band, at both widths.
 *   discography-390
 *   music-1440        the catalogue route, for comparison with the homepage ledger.
 *
 * The intro curtain is skipped with the same session key the motion QA uses (`an-curtain`), so a
 * shot is of the page rather than of the curtain. The shader is given time to paint, and — because a
 * full-page screenshot of a WebGL canvas can catch a blank frame — the pass is repeated once with a
 * short settle.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import puppeteer from "puppeteer-core";

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const base = argValue("--base", process.env.AUDIT_BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const outDir = argValue("--out", "public/review-shots");

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  const found = candidates.find((path) => existsSync(path));
  if (found) return found;
  try {
    return execFileSync("which", ["google-chrome"], { encoding: "utf8" }).trim();
  } catch {
    throw new Error("No Chrome found. Set CHROME_PATH to a Chrome/Chromium binary.");
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=swiftshader",
    "--enable-unsafe-swiftshader",
    "--force-device-scale-factor=1",
    "--hide-scrollbars",
  ],
});

/** Skip the curtain, wait for fonts, and let the shader paint before anything is photographed. */
async function prepare(page) {
  await page.evaluate(() => {
    try {
      sessionStorage.setItem("an-curtain", "1");
    } catch {
      /* private mode: the curtain simply plays, and the shot waits for it below. */
    }
  });
  await page.reload({ waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await sleep(1200);
  /* Scroll the whole page once so every lazy image is requested, then come back to the top. */
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo(0, 0);
  });
  await sleep(1600);
}

async function capture({ name, route, width, height, mobile = false, fullPage = false, anchor = "" }) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  await page.goto(`${base}${route}`, { waitUntil: "load", timeout: 60000 });
  await prepare(page);
  /*
   * `prepare()` scrolls the whole page and returns to the top, which is right for the hero shot and
   * wrong for a band-specific one — a `#release` URL is also reset by the scroll layer on load. So the
   * anchor is applied *after* preparation, and the scroll is allowed to settle before the shutter.
   */
  if (anchor) {
    await page.evaluate((selector) => {
      const node = document.querySelector(selector);
      if (node) window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY - 90);
    }, anchor);
    await sleep(1400);
  }
  const path = join(outDir, `${name}.png`);
  await page.screenshot({ path, fullPage, captureBeyondViewport: fullPage });
  const size = await page.evaluate(() => ({
    w: document.documentElement.scrollWidth,
    h: document.documentElement.scrollHeight,
  }));
  console.log(`wrote ${path} — ${width}×${height} viewport, document ${size.w}×${size.h}${fullPage ? " (full page)" : ""}`);
  await page.close();
}

try {
  await capture({ name: "home-390", route: "/", width: 390, height: 844, mobile: true });
  await capture({ name: "home-390-full", route: "/", width: 390, height: 844, mobile: true, fullPage: true });
  await capture({ name: "home-1440", route: "/", width: 1440, height: 900 });
  await capture({ name: "home-1440-full", route: "/", width: 1440, height: 900, fullPage: true });
  await capture({ name: "music-1440", route: "/music", width: 1440, height: 900 });
  await capture({ name: "release-1440", route: "/", width: 1440, height: 900, anchor: "#release" });
  await capture({ name: "release-390", route: "/", width: 390, height: 844, mobile: true, anchor: "#release" });
  await capture({ name: "discography-1440", route: "/", width: 1440, height: 900, anchor: "#catalogue" });
  await capture({ name: "discography-390", route: "/", width: 390, height: 844, mobile: true, anchor: "#catalogue" });
  console.log(`\nall shots written to ${outDir}/`);
} finally {
  await browser.close();
}
