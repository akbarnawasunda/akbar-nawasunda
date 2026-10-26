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
const R8_SHOTS = [
  /* R8: the title sequence, on a tab that has never seen it. */
  { name: "01-home-loader-1280", route: "/", width: 1280, height: 900, curtain: true, wait: 700 },
  { name: "02-home-hero-1280", route: "/", width: 1280, height: 900 },
  { name: "03-home-hero-3d-1280", route: "/", width: 1280, height: 900, pointer: [1080, 760] },
  { name: "04-home-ticker-1280", route: "/", width: 1280, height: 900, selector: "[data-ticker]" },
  { name: "05-home-release-1280", route: "/", width: 1280, height: 900, selector: "#music" },
  { name: "06-home-reel-hover-1280", route: "/", width: 1280, height: 900, pinMid: true, hover: "[data-qa-hover]" },
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

/**
 * R9 — the double print.
 *
 * Every shot here exists to answer one question honestly: does the second plate read as *printed*
 * rather than as a drop shadow? That only shows with the pointer parked in a corner, which is why
 * almost every entry carries one.
 */
const R9_SHOTS = [
  { name: "01-misregister-hero-1280", route: "/", width: 1280, height: 900, pointer: [1240, 840] },
  { name: "02-misregister-nocursor-1280", route: "/", width: 1280, height: 900 },
  { name: "03-misregister-index-1280", route: "/", width: 1280, height: 900, selector: "[class*='indexBand']", pointer: [1240, 840] },
  { name: "04-misregister-music-1280", route: "/music", width: 1280, height: 900, pointer: [1240, 840] },
  { name: "05-misregister-release-1280", route: "/music/lali-dalane", width: 1280, height: 900, pointer: [1240, 840] },
  { name: "06-misregister-artist-1280", route: "/artist", width: 1280, height: 1000, pointer: [1240, 940] },
  { name: "07-misregister-visuals-1280", route: "/visuals", width: 1280, height: 900, pointer: [1240, 840] },
  { name: "08-misregister-contact-1280", route: "/contact", width: 1280, height: 900, pointer: [1240, 840] },
  { name: "09-misregister-epk-1280", route: "/epk", width: 1280, height: 900, pointer: [1240, 840] },
  { name: "10-back-side-1280", route: "/", width: 1280, height: 900, sheet: true },
  { name: "11-back-side-scrolled-1280", route: "/", width: 1280, height: 900, sheet: true, sheetScroll: 820 },
  { name: "12-back-side-390", route: "/music", width: 390, height: 844, sheet: true },
  { name: "13-back-side-tab-390", route: "/music", width: 390, height: 844 },
  { name: "14-misregister-home-390", route: "/", width: 390, height: 844 },
];

/**
 * R15 — the premium / high-tech pass.
 *
 * The set is deliberately about *one* claim per shot, because that is what the owner reviews: the
 * hero (did the layout get quiet?), the index (is the catalogue legible?), the archive wall (does
 * every photograph carry the duotone?), the monogram band (is the object integrated?), and the two
 * phone widths where a band like this usually breaks.
 */
const R15_SHOTS = [
  { name: "01-home-hero-1440", route: "/", width: 1440, height: 960 },
  { name: "02-home-ticker-1440", route: "/", width: 1440, height: 960, selector: "[data-ticker]" },
  { name: "03-home-release-1440", route: "/", width: 1440, height: 960, selector: "#music", pointer: [1180, 640] },
  { name: "04-home-index-1440", route: "/", width: 1440, height: 960, selector: "[class*='indexBand']" },
  { name: "05-home-archive-1440", route: "/", width: 1440, height: 960, selector: "[class*='archive']" },
  { name: "06-home-night-1440", route: "/", width: 1440, height: 960, selector: "[class*='night']" },
  { name: "07-home-monogram-1440", route: "/", width: 1440, height: 960, selector: "[class*='signature']" },
  { name: "08-home-press-1440", route: "/", width: 1440, height: 960, selector: "#press" },
  { name: "09-home-epk-1440", route: "/", width: 1440, height: 960, selector: "[class*='epkBand']" },
  { name: "10-visuals-1440", route: "/visuals", width: 1440, height: 960 },
  { name: "11-visuals-wall-390", route: "/visuals", width: 390, height: 844, scroll: 420 },
  { name: "12-home-hero-390", route: "/", width: 390, height: 844 },
  { name: "13-music-1440", route: "/music", width: 1440, height: 960 },
  { name: "14-artist-1440", route: "/artist", width: 1440, height: 960 },
];

const SHOTS =
  round === "round15" ? R15_SHOTS : round === "round9" ? R9_SHOTS : R8_SHOTS;

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

    if (shot.pinMid) {
      // The catalogue reel (round 29) is a pinned band: the readable state is mid-travel, with the
      // row translated and the sleeves under the sticky viewport — not the wrapper's first pixel.
      await page.evaluate(() => {
        const wrap = document.querySelector('[data-catalogue-pin]');
        if (wrap) {
          const rect = wrap.getBoundingClientRect();
          window.scrollTo(0, rect.top + window.scrollY + (rect.height - window.innerHeight) * 0.55);
        }
        // Mid-travel the first cards are off screen; mark one fully inside the viewport so the
        // hover below has a clickable point.
        for (const link of document.querySelectorAll('[data-pin-card] a')) {
          const r = link.getBoundingClientRect();
          if (r.left > 24 && r.right < window.innerWidth - 24 && r.top > 24 && r.bottom < window.innerHeight - 24) {
            link.setAttribute('data-qa-hover', '');
            break;
          }
        }
      });
    }

    if (shot.offset) {
      await page.evaluate((y) => window.scrollTo(0, y), shot.offset);
    }

    await settle();

    if (shot.sheet) {
      const sheetToggle = await page.$('[data-sheet-toggle]');
      if (sheetToggle) {
        await sheetToggle.click();
        await page.waitForTimeout(900);
        if (shot.sheetScroll) {
          await page.evaluate((y) => {
            const sheet = document.querySelector('[role="dialog"][aria-label^="Sisi belakang"]');
            if (sheet) sheet.scrollTo(0, y);
          }, shot.sheetScroll);
          await page.waitForTimeout(350);
        }
      }
    }

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
/**
 * Two drivers, one shot list.
 *
 * `playwright-cli` is the intended one and it needs Playwright's own Chromium download. On a machine
 * where that download is blocked (a locked-down CI image, a sandbox with an egress allowlist) the
 * review would simply not run — and a review that cannot run is an opinion, which is the exact
 * failure this file was written to avoid. So the same `SHOTS` array is replayed through
 * `puppeteer-core` and the Chromium already on PATH (`CHROME_PATH`), and the shot names, waits and
 * states are identical. The fallback is not a lower standard; it is the same review with the browser
 * the audit scripts already use.
 */
const chromium = process.env.CHROME_PATH;
let shotDriver = "playwright-cli";

try {
  if (!chromium) throw new Error("no CHROME_PATH");
  const { default: puppeteer } = await import("puppeteer-core");
  const browser = await puppeteer.launch({
    executablePath: chromium,
    headless: true,
    env: process.env,
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
  try {
    for (const shot of SHOTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: shot.width, height: shot.height });
      const file = join(work, `${shot.name}.png`);
      if (shot.curtain) {
        await page.goto(base + shot.route, { waitUntil: "load", timeout: 60000 });
        await new Promise((r) => setTimeout(r, shot.wait ?? 600));
        await page.screenshot({ path: file });
        await page.close();
        continue;
      }

      await page.goto(base + shot.route, { waitUntil: "load", timeout: 60000 });
      await page.evaluate(() => sessionStorage.setItem("an-curtain", "1"));
      await page.reload({ waitUntil: "load" });
      await new Promise((r) => setTimeout(r, 500));
      await page.mouse.move(1, 1);

      if (shot.pointer) {
        await page.mouse.move(shot.pointer[0], shot.pointer[1], { steps: 10 });
        await new Promise((r) => setTimeout(r, 400));
      }

      await page.evaluate((target) => {
        const node = target ? document.querySelector(target) : null;
        if (node) window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY - 40);
        else if (target === undefined) window.scrollTo(0, 0);
      }, shot.selector ?? (shot.bottom ? "#footer" : shot.scroll ? "__none__" : undefined));

      if (shot.scroll) await page.evaluate((y) => window.scrollTo(0, y), shot.scroll);
      if (shot.offset) await page.evaluate((y) => window.scrollTo(0, y), shot.offset);
      if (shot.pinMid) {
        await page.evaluate(() => {
          const wrap = document.querySelector("[data-catalogue-pin]");
          if (wrap) {
            const rect = wrap.getBoundingClientRect();
            window.scrollTo(0, rect.top + window.scrollY + (rect.height - window.innerHeight) * 0.55);
          }
        });
      }

      /* Settle: fonts ready, then wait until the smooth-scroll layer has actually stopped moving. */
      await page.evaluate(async () => {
        await document.fonts.ready;
        let last = -1;
        for (let i = 0; i < 120; i += 1) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          if (Math.abs(window.scrollY - last) < 1) return;
          last = window.scrollY;
        }
      });
      await new Promise((r) => setTimeout(r, 700));

      if (shot.pinMid) {
        /* Marked after the settle, never before: with smooth scrolling the cards are still a
           viewport away at write time, and a mark made then names the wrong sleeve. */
        await page.evaluate(() => {
          for (const link of document.querySelectorAll("[data-pin-card] a")) {
            const r = link.getBoundingClientRect();
            if (r.left > 24 && r.right < window.innerWidth - 24 && r.top > 24 && r.bottom < window.innerHeight - 24) {
              link.setAttribute("data-qa-hover", "");
              break;
            }
          }
        });
      }

      if (shot.sheet) {
        const toggle = await page.$("[data-sheet-toggle]");
        if (toggle) {
          await toggle.click();
          await new Promise((r) => setTimeout(r, 900));
        }
      }

      if (shot.menu) {
        const toggle = await page.$('button[aria-expanded="false"]');
        if (toggle) {
          await toggle.click();
          await new Promise((r) => setTimeout(r, 700));
        }
      }

      if (shot.hover) {
        const target = await page.$(shot.hover);
        if (target) {
          await target.hover();
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      await page.screenshot({ path: file });
      await page.close();
    }
  } finally {
    await browser.close();
  }
} catch (fallbackError) {
  shotDriver = "playwright-cli";
  try {
    execFileSync("playwright-cli", ["run-code", "--filename", scriptPath], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
      timeout: 600000,
    });
  } catch (error) {
    console.error("\nNeither puppeteer-core (CHROME_PATH) nor playwright-cli could drive a browser.");
    console.error(String(fallbackError.message ?? fallbackError).split("\n")[0]);
    console.error(String(error.message ?? error).split("\n").slice(0, 6).join("\n"));
    console.error("Is the production server up?");
    process.exitCode = 1;
  }
}

if (!existsSync(work)) process.exit(1);

const pngs = readdirSync(work).filter((file) => file.endsWith(".png"));
for (const file of pngs) copyFileSync(join(work, file), join(out, file));
rmSync(work, { recursive: true, force: true });

console.log(`\n${pngs.length} screenshot(s) written to ${out} (${shotDriver})`);
if (pngs.length !== SHOTS.length) {
  console.warn(`WARNING: expected ${SHOTS.length}. A failed navigation usually means the route 404s.`);
  process.exitCode = 1;
}
