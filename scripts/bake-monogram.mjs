#!/usr/bin/env node
/**
 * Bake the liquid-metal monogram into still images.
 *
 * Round 20, owner's instruction: "3D pake liquid aja, jangan 3d, berat jir" — the *look* of the
 * liquid metal stays, the WebGL engine that computed it every frame does not. The look cannot be
 * approximated in CSS (a chrome surface is nothing but what it reflects), so it is captured once,
 * from the real renderer, and shipped as pixels:
 *
 *   - `liquid-metal-wide.webp`   — the ≥1024 px composition, mark offset right behind the portrait;
 *   - `liquid-metal-narrow.webp` — the <1024 px composition, mark centred in the band.
 *
 * HOW TO RUN: this script captures from a *served build that still contains the renderer*, i.e. any
 * tree at or before commit e262b86 (round 19). The round-20 tree no longer ships three.js, so there
 * is nothing left to capture from — the baked webp files in `public/assets/monogram/` are now the
 * source of truth, and this script is their provenance record.
 *
 *   npm run build && npm run start -- -p 3000   # from a pre-round-20 worktree
 *   CHROME_PATH=/tmp/chromium node scripts/bake-monogram.mjs --base http://127.0.0.1:3000
 *
 * Determinism: the idle pose is a slow sway, so "the" pose is the settled one — the script waits for
 * the scene's own `data-ready` flag plus a settle beat, then screenshots the canvas element itself,
 * not the viewport, so the band's type never lands in the bake.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const base = argValue("--base", "http://127.0.0.1:3000").replace(/\/$/, "");
const outDir = argValue("--out", "public/assets/monogram");

const { default: puppeteer } = await import("puppeteer-core");
const chromium = process.env.CHROME_PATH;
if (!chromium) throw new Error("CHROME_PATH must point at a Chromium binary");

const browser = await puppeteer.launch({
  executablePath: chromium,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});

const COMPOSITIONS = [
  { name: "liquid-metal-wide", width: 1440, height: 900 },
  { name: "liquid-metal-narrow", width: 900, height: 800 },
];

mkdirSync(outDir, { recursive: true });

for (const composition of COMPOSITIONS) {
  const page = await browser.newPage();
  await page.setViewport({
    width: composition.width,
    height: composition.height,
    deviceScaleFactor: 1.5,
  });
  await page.evaluateOnNewDocument(() => {
    try {
      sessionStorage.setItem("an-curtain", "1");
    } catch {
      /* private mode: the curtain is a courtesy, not a contract */
    }
  });
  await page.goto(`${base}/`, { waitUntil: "load", timeout: 60000 });
  /*
   * The renderer only mounts once the band is actually on screen — that gate is the whole point of
   * its LCP budget — so the bake has to bring the band to the viewport before it can wait for the
   * first painted frame.
   */
  await page.evaluate(() => {
    const band = document.querySelector('[class*="signature"]');
    if (!band) return;
    /*
     * Band top exactly at the viewport top: that is scroll progress 0 for the scene's own readScroll,
     * i.e. the rest pose — base scale, no scroll easing baked into the pixels.
     */
    window.scrollTo({ top: band.getBoundingClientRect().top + window.scrollY, behavior: "instant" });
  });
  await page.waitForSelector('[data-ready="true"]', { timeout: 60000 });
  /* The sway, the bloom mip chain and the PMREM room all settle inside a couple of seconds; the
     pose after them is the pose the brand has been showing since round 15. */
  await new Promise((resolve) => setTimeout(resolve, 3200));
  const canvas = await page.$("canvas");
  if (!canvas) throw new Error(`${composition.name}: no canvas in the served build`);
  /*
   * An element screenshot is the page's pixels inside the element's box — the fixed header, the
   * band's own type and the HUD furniture all paint over the canvas and would bake into it. So for
   * the capture everything that is not the canvas subtree goes to `visibility: hidden`, and the host
   * is raised to opacity 1: the shipped component puts it back at 0.92 over the same black band,
   * which reproduces today's composite exactly once, not twice.
   */
  await page.evaluate(() => {
    const target = document.querySelector("canvas");
    if (!target) return;
    const host = target.parentElement;
    if (host) host.style.opacity = "1";
    const ancestors = new Set();
    for (let node = host; node; node = node.parentElement) ancestors.add(node);
    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      if (ancestors.has(el) || (host && host.contains(el))) continue;
      el.style.visibility = "hidden";
    }
  });
  const file = join(outDir, `${composition.name}.png`);
  await canvas.screenshot({ path: file });
  const box = await canvas.boundingBox();
  console.log(
    `${composition.name}: ${Math.round(box.width)}x${Math.round(box.height)} css px → ${file}`,
  );
  await page.close();
}

await browser.close();
console.log("bake complete — convert to webp and delete the png intermediates.");
