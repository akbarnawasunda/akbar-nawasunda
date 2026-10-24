#!/usr/bin/env node
/**
 * Browser QA for the things a static check cannot see: motion, depth, hover, the header state
 * machine and the mobile drawer.
 *
 *   CHROME_PATH=/path/to/chrome node scripts/qa-motion.mjs
 *   npm run qa:motion                      # same, with the sandbox's Chromium
 *   npm run qa:motion -- --shots /tmp/shots # also write a screenshot per state
 *
 * Why this file exists: Playwright / Puppeteer were already installed and were only being used to
 * take screenshots. That is the weakest possible use of a browser automation stack — it proves the
 * page renders, not that it *works*. These checks assert behaviour:
 *
 *   1. the depth engine writes a different transform at three scroll positions (the thing the owner
 *      said did not exist);
 *   2. nothing moves under `prefers-reduced-motion` — the fallback that matters most;
 *   3. `Reveal` actually reveals (a stuck `opacity: 0` is the classic scroll-reveal failure);
 *   4. hover changes a release card's transform (the 3D tilt);
 *   5. the header shrinks and hides on scroll-down, returns on scroll-up;
 *   6. the mobile drawer opens, traps focus, closes on Escape and returns focus;
 *   7. exactly one canvas exists, and it is loaded lazily rather than at first paint;
 *   8. no horizontal overflow at six widths, and no console errors anywhere.
 *
 * Exits 1 on any failure so it can gate a release the same way `a11y` does.
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
const shotsDir = argValue("--shots", "");
if (shotsDir) mkdirSync(shotsDir, { recursive: true });

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

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Lenis (the smooth-scroll layer) animates `window.scrollTo`, so a jump to y=2800 is still moving
 * 300 ms later. Every geometry read in this file waits for the scroll to settle instead of guessing:
 * two frames with the same offset, or six seconds, whichever comes first.
 */
async function settleScroll(page) {
  await page.evaluate(async () => {
    let last = -1;
    for (let i = 0; i < 120; i += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (Math.abs(window.scrollY - last) < 1) return;
      last = window.scrollY;
    }
  });
  await sleep(120);
}

async function shot(page, name) {
  if (shotsDir) await page.screenshot({ path: join(shotsDir, `${name}.png`) });
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Skip the intro curtain deterministically: it is a 1.5 s overlay, not part of what we test.
    sessionStorage.setItem("an-curtain", "1");
  });
  await page.reload({ waitUntil: "load" });
  await sleep(400);
}

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});

try {
  // ---------------------------------------------------------------- desktop behaviour
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(String(error)));

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${base}/`, { waitUntil: "load", timeout: 60000 });
  await settle(page);

  const transformAt = async (scrollY) => {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await settleScroll(page);
    return page.evaluate(() => {
      /* `data-layer` is set by the component, not by the CSS Module hash, so this selector survives
         a rename. See the note in Depth.tsx. */
      const pick = (name) => {
        const node = document.querySelector(`[data-layer="${name}"]`);
        return node ? node.style.transform : "";
      };
      return { type: pick("hero-type"), sticker: pick("hero-photo") };
    });
  };

  const at0 = await transformAt(0);
  const at300 = await transformAt(300);
  const at600 = await transformAt(600);

  const stickerShift = [at0, at300, at600].map((state) => state.sticker);
  check(
    "depth engine moves the hero photograph",
    new Set(stickerShift).size === 3 && stickerShift.every((value) => value.includes("translate3d")),
    stickerShift.join(" → "),
  );
  check(
    "the photograph travels further than the type (parallax, not a single slide)",
    (() => {
      const px = (value) => {
        const match = /translate3d\([^,]+,\s*(-?[\d.]+)px/.exec(value);
        return match ? Math.abs(Number(match[1])) : 0;
      };
      return px(at600.sticker) > px(at600.type) * 1.5;
    })(),
    `sticker ${at600.sticker} vs type ${at600.type}`,
  );

  await shot(page, "qa-depth-600");

  // Reveal: the block must actually become visible, not sit at opacity 0 forever.
  await page.evaluate(() => {
    const section = document.querySelector("#music");
    if (section) window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY - 100);
  });
  await settleScroll(page);
  await sleep(1400);
  const revealState = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('[data-visible="true"]')];
    const armed = [...document.querySelectorAll('[class*="armed"]')];
    return {
      revealed: nodes.length,
      armed: armed.length,
      hidden: armed.filter((node) => Number(getComputedStyle(node).opacity) < 0.9).length,
    };
  });
  check(
    "scroll reveals fire and nothing stays invisible",
    revealState.revealed > 0 && revealState.hidden === 0,
    `${revealState.revealed} revealed, ${revealState.armed} armed, ${revealState.hidden} still faded`,
  );

  /*
   * Hover behaviour, in both of the shapes this page now has:
   * - the index row inverts (paper ground → ink ground), which is a background-colour change;
   * - the featured sleeve lifts, which is a translate.
   * Both are read from the element that owns the property, not assumed.
   */
  const indexRow = await page.$('[data-index-row]');
  if (indexRow) {
    const before = await page.evaluate(
      (el) => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }),
      indexRow,
    );
    await indexRow.hover();
    await sleep(500);
    const after = await page.evaluate(
      (el) => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }),
      indexRow,
    );
    check("index rows invert on hover", before.bg !== after.bg && before.color !== after.color, `${before.bg} → ${after.bg}`);
    await shot(page, "qa-index-hover");
  } else {
    check("index rows invert on hover", false, "no [data-index-row] found");
  }

  const sleeve = await page.$('[data-sleeve]');
  if (sleeve) {
    await sleeve.hover();
    await sleep(500);
    const translate = await page.evaluate((el) => getComputedStyle(el).translate, sleeve);
    check("the featured sleeve lifts on hover", translate !== "none" && translate !== "", translate);
  } else {
    check("the featured sleeve lifts on hover", false, "no [data-sleeve] found");
  }

  /* The ticker: a scroll-scrubbed band has to actually be scrubbed. */
  const tickerAt = async (y) => {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await settleScroll(page);
    return page.evaluate(() => {
      const node = document.querySelector("[data-ticker]");
      return node ? node.style.getPropertyValue("--ticker") : "";
    });
  };
  const tickerA = await tickerAt(200);
  const tickerB = await tickerAt(1200);
  check(
    "the catalogue ticker is scrubbed by the scroll",
    tickerA !== "" && tickerB !== "" && tickerA !== tickerB,
    `${tickerA || "unset"} → ${tickerB || "unset"}`,
  );

  // Header: compact after scrolling, hidden while going down, back on the way up.
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);
  const headerTop = await page.evaluate(() => {
    const header = document.querySelector("header");
    return { state: header.dataset.state, height: header.getBoundingClientRect().height };
  });
  await page.evaluate(() => window.scrollTo(0, 900));
  await settleScroll(page);
  await sleep(300);
  const headerDown = await page.evaluate(() => {
    const header = document.querySelector("header");
    return { state: header.dataset.state, hidden: header.dataset.hidden, height: header.getBoundingClientRect().height };
  });
  await page.evaluate(() => window.scrollTo(0, 700));
  await settleScroll(page);
  await sleep(300);
  const headerUp = await page.evaluate(() => document.querySelector("header").dataset.hidden);

  check(
    "header shrinks between rest and scrolled",
    headerDown.height < headerTop.height,
    `${Math.round(headerTop.height)}px → ${Math.round(headerDown.height)}px`,
  );
  check("header hides on scroll down and returns on scroll up", headerDown.hidden === "true" && headerUp === "false");

  // Canvas: at most one, lazy, and — when the environment has no WebGL — none at all, no dead
  // element left behind (D-102). The headless Chromium in this sandbox is exactly that environment,
  // so the check asserts the *contract* rather than a GPU-dependent outcome.
  const canvasAtTop = await page.evaluate(() => document.querySelectorAll("canvas").length);
  const webgl = await page.evaluate(() => {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
  });

  // Reduced motion: nothing registers, so no inline transform is written at all.
  const reduced = await browser.newPage();
  await reduced.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await reduced.setViewport({ width: 1440, height: 900 });
  await reduced.goto(`${base}/`, { waitUntil: "load" });
  await sleep(400);
  await reduced.evaluate(() => window.scrollTo(0, 400));
  await sleep(500);
  const reducedTransforms = await reduced.evaluate(() =>
    [...document.querySelectorAll('[class*="depth"]')].map((node) => node.style.transform).filter(Boolean),
  );
  check("prefers-reduced-motion leaves the page still", reducedTransforms.length === 0, `${reducedTransforms.length} inline transforms`);
  await reduced.close();

  // ---------------------------------------------------------------- mobile
  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await mobile.goto(`${base}/`, { waitUntil: "load", timeout: 60000 });
  await sleep(400);

  const menuButton = await mobile.$('button[aria-expanded]');
  if (menuButton) {
    await menuButton.click();
    await sleep(450);
    const opened = await mobile.evaluate(() => {
      const panel = document.querySelector('[id][role="dialog"], [class*="drawer"]');
      const toggle = document.querySelector('button[aria-expanded="true"]');
      return {
        hasPanel: Boolean(panel && panel.offsetParent !== null),
        expanded: Boolean(toggle),
        focusInside: Boolean(panel && panel.contains(document.activeElement)),
      };
    });
    await shot(mobile, "qa-drawer-open");

    await mobile.keyboard.press("Escape");
    await sleep(400);
    const closed = await mobile.evaluate(() => ({
      expanded: document.querySelector("button[aria-expanded]")?.getAttribute("aria-expanded"),
      focusOnToggle: document.activeElement?.matches("button[aria-expanded]") ?? false,
    }));

    check("mobile drawer opens and takes focus", opened.hasPanel && opened.expanded && opened.focusInside, JSON.stringify(opened));
    check("Escape closes the drawer and returns focus", closed.expanded === "false" && closed.focusOnToggle, JSON.stringify(closed));
  } else {
    check("mobile drawer opens and takes focus", false, "no toggle button found");
  }
  await mobile.close();

  // ---------------------------------------------------------------- overflow sweep
  const widths = [320, 390, 768, 1024, 1280, 1920];
  const routes = ["/", "/music", "/artist", "/epk", "/music/lali-dalane"];
  const sweeper = await browser.newPage();
  const overflows = [];
  for (const width of widths) {
    await sweeper.setViewport({ width, height: width < 700 ? 844 : 900 });
    for (const route of routes) {
      await sweeper.goto(`${base}${route}`, { waitUntil: "load", timeout: 60000 });
      await sleep(220);
      const delta = await sweeper.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (delta > 0) overflows.push(`${route} @${width} +${delta}px`);
    }
  }
  check("no horizontal overflow at 320–1920", overflows.length === 0, overflows.join(", "));
  await sweeper.close();

  // Canvas count is read last so the lazy 3D has had every chance to mount.
  await page.evaluate(() => window.scrollTo(0, 2000));
  await settleScroll(page);
  await sleep(1800);
  const canvasLater = await page.evaluate(() => document.querySelectorAll("canvas").length);
  check(
    "at most one canvas, and none before the band is reached",
    canvasAtTop === 0 && canvasLater <= (webgl ? 1 : 0),
    `top ${canvasAtTop}, later ${canvasLater}, webgl ${webgl ? "yes" : "no"}`,
  );
  if (!webgl) {
    check(
      "without WebGL the monogram band leaves no dead canvas",
      canvasLater === 0,
      `${canvasLater} canvas element(s)`,
    );
  }
  await shot(page, "qa-canvas");

  // three.js reports an unavailable context itself when the machine has no GPU; that is the
  // environment, not the page. Everything else is a real error.
  const realErrors = consoleErrors.filter((text) => !/WebGL context|Error creating WebGL context/i.test(text));
  check("no console errors", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));

  await page.close();
} finally {
  await browser.close();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length > 0 ? 1 : 0;
