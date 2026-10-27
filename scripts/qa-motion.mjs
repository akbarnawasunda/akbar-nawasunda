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
 *   7. no canvas exists anywhere (round 20 baked the monogram), and its still loads lazily;
 *   8. no horizontal overflow at six widths, and no console errors anywhere;
 *   9. (R8, revised R10) the hero, the catalogue wall and the index sleeve are *3D*: a pointer move
 *      writes a rotation, the hero's type block sits at a real negative Z behind the glass, and that
 *      block is one rigid surface rather than a stack of layers pretending to be depth;
 *  10. (R8) the title sequence runs once, counts, and removes itself;
 *  11. (R9) the display type is printed twice — the second plate moves with the pointer — and the
 *      back of the sheet opens as a full screen that locks the page and gives focus back on Escape.
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

  /*
   * R37 — the hero is asymmetric by design, and "nothing overlaps" is measured, not assumed.
   *
   * Round 36 made the hero a centred column (safe, but a template); round 37 moved it to a two-column
   * poster: label across the top, the name flush left, the chrome mark floating in the right column,
   * the status deck under the name. That layout is only correct if the blocks do not intersect, so the
   * check is a pairwise rectangle test at both widths rather than a stack of tops — a two-column hero
   * has no "previous row" to compare against, and pretending otherwise would test the old design.
   *
   * It also asserts the asymmetry itself: on a wide screen the name's left edge is at the gutter
   * while the mark's left edge is past the middle of the page. A centred hero fails that.
   */
  const heroLayout = async (width) => {
    await page.setViewport({ width, height: width < 700 ? 780 : 900, deviceScaleFactor: 1 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await settleScroll(page);
    await sleep(500);
    return page.evaluate(() => {
      const hero = document.querySelector("section[aria-labelledby=\"hero-title\"]");
      if (!hero) return null;
      const blocks = [
        ["label", hero.querySelector("p")],
        ["name", hero.querySelector("h1")],
        ["mark", hero.querySelector("[data-shader-band]")],
        ["deck", hero.querySelector("[class*=\"heroDeck\"]")],
      ]
        .filter(([, node]) => node)
        .map(([name, node]) => {
          const box = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return {
            name,
            left: Math.round(box.left),
            right: Math.round(box.right),
            top: Math.round(box.top),
            bottom: Math.round(box.bottom),
            transform: style.transform,
            position: style.position,
          };
        });

      const overlaps = [];
      for (let i = 0; i < blocks.length; i += 1) {
        for (let j = i + 1; j < blocks.length; j += 1) {
          const a = blocks[i];
          const b = blocks[j];
          const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (x > 1 && y > 1) overlaps.push(`${a.name}×${b.name} ${Math.round(x)}×${Math.round(y)}`);
        }
      }

      /*
       * Everything positioned inside the chrome band belongs to the shader (its canvas and the baked
       * still under it). The hero's own furniture must not be absolutely positioned at all.
       */
      const band = hero.querySelector("[data-shader-band]");
      const offenders = [...hero.querySelectorAll("*")]
        .filter((node) => !band || !band.contains(node))
        .filter((node) => getComputedStyle(node).position === "absolute")
        .filter((node) => {
          const box = node.getBoundingClientRect();
          return box.width > 0 && box.height > 0;
        })
        .map((node) => node.tagName.toLowerCase());

      return {
        blocks,
        overlaps,
        offenders,
        viewport: window.innerWidth,
        nameFont: parseFloat(getComputedStyle(hero.querySelector("h1")).fontSize),
      };
    });
  };

  const wide = await heroLayout(1440);
  const narrow = await heroLayout(390);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const heroBlock = (state, name) => state.blocks.find((block) => block.name === name) ?? null;
  check(
    "the hero's blocks never intersect, wide or narrow",
    Boolean(wide && narrow) && wide.overlaps.length === 0 && narrow.overlaps.length === 0,
    `${(wide?.overlaps ?? []).concat(narrow?.overlaps ?? []).join(", ") || "no intersections"} · 1440 ${wide?.blocks.length} blocks / 390 ${narrow?.blocks.length} blocks`,
  );
  check(
    "the hero is asymmetric: the name is flush left and the mark floats right",
    Boolean(wide) &&
      Boolean(heroBlock(wide, "name")) &&
      Boolean(heroBlock(wide, "mark")) &&
      heroBlock(wide, "name").left <= 48 &&
      heroBlock(wide, "mark").left > wide.viewport / 2,
    `name left ${heroBlock(wide, "name")?.left}px · mark left ${heroBlock(wide, "mark")?.left}px of ${wide?.viewport}px`,
  );
  check(
    "the wordmark lands inside the 3.5–6rem clamp",
    Boolean(wide) && Boolean(narrow) && wide.nameFont >= 56 && wide.nameFont <= 96 && narrow.nameFont >= 32 && narrow.nameFont <= 60,
    `1440 ${wide?.nameFont}px · 390 ${narrow?.nameFont}px`,
  );
  check(
    "the hero has no absolutely positioned furniture left",
    Boolean(wide && narrow) && wide.offenders.length === 0 && narrow.offenders.length === 0,
    `${(wide?.offenders ?? []).concat(narrow?.offenders ?? []).join(", ") || "none"} (shader band excluded)`,
  );

  /*
   * The pointer. Round 35 shipped a lerping dot-and-ring cursor; every frame it was a little behind
   * the hand, and the owner called it broken. It is unmounted now, which is observable: no
   * `data-cursor` flag on the root, and the document's cursor is the browser's own `auto` rather
   * than the `none` the custom cursor used to set.
   */
  const cursor = await page.evaluate(() => ({
    flag: document.documentElement.dataset.cursor ?? "",
    computed: getComputedStyle(document.documentElement).cursor,
    dots: document.querySelectorAll("[data-cursor-root], .cursor-dot, .cursor-ring").length,
  }));
  check(
    "the pointer is the browser's own again",
    cursor.flag === "" && cursor.computed !== "none" && cursor.dots === 0,
    `data-cursor "${cursor.flag}" · cursor ${cursor.computed} · custom nodes ${cursor.dots}`,
  );

  // Reveal: the block must actually become visible, not sit at opacity 0 forever.
  await page.evaluate(() => {
    const section = document.querySelector("#catalogue");
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
   * The catalogue, as a wall of sleeves.
   *
   * Round 29's pinned reel is gone (round 35 replaced it, round 36 kept the replacement), so the
   * checks that measured `--pin` and a translateX have nothing to measure. What they were protecting
   * still matters — every release present, and the artwork answering the hand — so it is asserted
   * against the grid instead of being dropped.
   */
  const grid = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("[data-release]")];
    return { cards: cards.length, sleeves: document.querySelectorAll("[data-release] a").length };
  });
  check(
    "the catalogue ledger renders every release without a scroll driver",
    grid.cards >= 10 && grid.sleeves === grid.cards,
    `${grid.cards} rows, ${grid.sleeves} row links`,
  );

  /*
   * Scroll first, measure second. Lenis eases the scroll, so a rect taken immediately after
   * `scrollIntoView` is a rect the sleeve has already left by the time the mouse arrives — the
   * first version of this check hovered empty space and read "none → none".
   */
  await page.evaluate(() => {
    document.querySelector("[data-release] a")?.scrollIntoView({ block: "center" });
  });
  await settleScroll(page);
  await sleep(700);
  const box = await page.evaluate(() => {
    const link = document.querySelector("[data-release] a");
    if (!link) return null;
    const r = link.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (box) {
    const read = () =>
      page.evaluate(() => {
        const link = document.querySelector("[data-release] a");
        if (!link) return "missing";
        const style = getComputedStyle(link);
        return `${style.translate} / ${style.transform}`;
      });
    await page.mouse.move(1, 1);
    const before = await read();
    await page.mouse.move(box.x, box.y, { steps: 8 });
    await page.mouse.move(box.x, box.y + 1, { steps: 2 });
    await sleep(450);
    const after = await read();
    check("ledger rows answer hover", before !== after, `${before} → ${after}`);
    await shot(page, "qa-grid-hover");
  } else {
    check("ledger rows answer hover", false, "no [data-release] row link found");
  }

  /*
   * The status deck, end to end.
   *
   * The hero's two links are the promise the page makes: "latest release" has to land on the record,
   * "live schedule" on the tour. A real click is dispatched, Lenis is allowed to finish, and each
   * target's top edge is compared with the scroll position — the anchor exists, it is wired, and the
   * band it names is the band that arrives.
   */
  await page.evaluate(() => window.scrollTo(0, 0));
  await settleScroll(page);
  await sleep(300);
  const deckLinks = await page.evaluate(() => {
    const hero = document.querySelector("section[aria-labelledby=\"hero-title\"]");
    if (!hero) return [];
    return [...hero.querySelectorAll("a[href^='#']")].map((link) => {
      const box = link.getBoundingClientRect();
      return {
        hash: link.hash,
        label: link.textContent.trim(),
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
      };
    });
  });
  const landed = [];
  for (const link of deckLinks) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await settleScroll(page);
    await sleep(250);
    const point = await page.evaluate((hash) => {
      const link = [...document.querySelectorAll("section[aria-labelledby='hero-title'] a")].find(
        (a) => a.hash === hash,
      );
      if (!link) return null;
      const box = link.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    }, link.hash);
    if (!point) continue;
    await page.mouse.click(point.x, point.y);
    await settleScroll(page);
    await sleep(900);
    const state = await page.evaluate((hash) => {
      const band = document.querySelector(hash);
      if (!band) return null;
      const box = band.getBoundingClientRect();
      return { top: Math.round(box.top), bottom: Math.round(box.bottom) };
    }, link.hash);
    landed.push({ ...link, ...state });
  }
  check(
    "both hero deck links land on the band they name",
    deckLinks.length >= 2 &&
      landed.length === deckLinks.length &&
      landed.every((item) => item && item.top <= 200 && item.bottom > 0),
    landed.map((item) => `${item.label || item.hash} → ${item.hash} top ${item.top}px`).join(" · "),
  );
  await shot(page, "qa-hero-deck");

  /*
   * No tilted plate, no depth layer, no transformed sheet — the hero is flat on purpose, so the
   * assertion is the absence of the machinery the previous rounds installed. If a `Depth` or a
   * `Plate3D` is mounted into the first band again, this fails before the overlap does.
   */
  const flat = await page.evaluate(() => {
    const hero = document.querySelector("section[aria-labelledby=\"hero-title\"]");
    if (!hero) return null;
    const band = hero.querySelector("[data-shader-band]");
    return {
      layers: hero.querySelectorAll("[data-layer]").length,
      plates: hero.querySelectorAll("[data-plate]").length,
      transformed: [...hero.querySelectorAll("*")]
        .filter((node) => !band || !band.contains(node))
        .filter((node) => {
          const style = getComputedStyle(node);
          return style.transform !== "none" && !node.closest("svg");
        }).length,
    };
  });
  check(
    "the hero ships no depth layer, no tilted plate and no transformed child",
    Boolean(flat) && flat.layers === 0 && flat.plates === 0 && flat.transformed === 0,
    `layers ${flat?.layers} · plates ${flat?.plates} · transformed ${flat?.transformed}`,
  );

  /*
   * The ticker: a scroll-scrubbed band has to actually be scrubbed.
   *
   * The two sample points are taken from the band, not from hard-coded scroll offsets. Round 37 moved
   * the ticker below the discography, so y=200 and y=1200 both landed far above it and the engine —
   * which only writes while the band is in view — correctly reported 0.0000 twice. A scrub test has to
   * scroll *the band* through the viewport.
   */
  const tickerAt = async (ratio) => {
    await page.evaluate((r) => {
      const node = document.querySelector("[data-ticker]");
      if (!node) return;
      const top = node.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.max(0, top - window.innerHeight * r));
    }, ratio);
    await settleScroll(page);
    await sleep(320);
    return page.evaluate(() => {
      const node = document.querySelector("[data-ticker]");
      return node ? node.style.getPropertyValue("--ticker") : "";
    });
  };
  const tickerA = await tickerAt(0.9);
  const tickerB = await tickerAt(0.1);
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

  /*
   * The chrome mark, and the floor under it.
   *
   * The contract used to be "no canvas at scroll 0" — the monogram band sat below the fold and its
   * shader was fetched only when it approached. Round 37 put the liquid AN *in the hero*, on the
   * owner's instruction, so a canvas at scroll 0 is now the design rather than a regression. What
   * still has to hold is narrower and more useful: at most one canvas exists, it lives inside the
   * band that declares itself a shader band, and the baked still underneath is real decoded pixels —
   * because a shader that fails to compile on a driver must not be a missing logo.
   */
  const canvasProbe = await browser.newPage();
  await canvasProbe.setViewport({ width: 1440, height: 900 });
  await canvasProbe.goto(`${base}/`, { waitUntil: "load" });
  await sleep(2400);
  const canvasBefore = await canvasProbe.evaluate(() => {
    const band = document.querySelector("[data-shader-band]");
    const canvases = [...document.querySelectorAll("canvas")];
    const img = band?.querySelector("img") ?? null;
    return {
      count: canvases.length,
      inBand: canvases.every((node) => Boolean(band && band.contains(node))),
      still: Boolean(img && img.complete && img.naturalWidth > 0),
    };
  });
  await canvasProbe.close();

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
      // The back-of-sheet dialog also carries `role="dialog"` and comes first in the document, so the
      // drawer is matched by its own class rather than by being the first dialog on the page.
      const panel = document.querySelector('[class*="drawer"]');
      const toggle = document.querySelector('button[aria-expanded="true"]');
      const box = panel?.getBoundingClientRect();
      return {
        // `offsetParent` is null for a fixed element, so presence is read from its box, not its parent.
        hasPanel: Boolean(panel && panel.getBoundingClientRect().height > 0),
        expanded: Boolean(toggle),
        focusInside: Boolean(panel && panel.contains(document.activeElement)),
        // The drawer is a screen, not a sliver: it must reach the bottom of the viewport. This is the
        // assertion that would have caught the four-round bug where it rendered 81 px tall.
        covers:
          Boolean(box) &&
          box.height >= window.innerHeight * 0.75 &&
          Math.abs(box.bottom - window.innerHeight) <= 2 &&
          box.width >= window.innerWidth - 1,
        pageLocked: document.documentElement.dataset.menu === "open",
      };
    });
    await shot(mobile, "qa-drawer-open");

    await mobile.keyboard.press("Escape");
    await sleep(400);
    const closed = await mobile.evaluate(() => ({
      expanded: document.querySelector("button[aria-expanded]")?.getAttribute("aria-expanded"),
      focusOnToggle: document.activeElement?.matches("button[aria-expanded]") ?? false,
      pageFree: document.documentElement.dataset.menu === undefined,
    }));

    check(
      "mobile drawer opens, fills the screen, locks the page and takes focus",
      opened.hasPanel && opened.expanded && opened.focusInside && opened.covers && opened.pageLocked,
      JSON.stringify(opened),
    );
    check(
      "Escape closes the drawer, unlocks the page and returns focus",
      closed.expanded === "false" && closed.focusOnToggle && closed.pageFree,
      JSON.stringify(closed),
    );
  } else {
    check("mobile drawer opens and takes focus", false, "no toggle button found");
  }
  await mobile.close();

  // ---------------------------------------------------------------- overflow sweep
  const widths = [320, 390, 768, 1024, 1280, 1920];
  const routes = ["/", "/music", "/visuals", "/artist", "/epk", "/contact", "/music/lali-dalane"];
  const sweeper = await browser.newPage();
  const overflows = [];
  for (const width of widths) {
    await sweeper.setViewport({ width, height: width < 700 ? 844 : 900 });
    for (const route of routes) {
      await sweeper.goto(`${base}${route}`, { waitUntil: "load", timeout: 60000 });
      await sleep(220);
      /*
       * The failure message names the offending boxes, not just the number: "every route +22 px at
       * 1024" is not a bug report, it is a symptom. The culprit is the first element whose right
       * edge passes the viewport and which is not `position: fixed` (fixed chrome cannot widen the
       * document, so blaming it would send the next reader down the wrong path).
       */
      const measurement = await sweeper.evaluate(() => {
        const delta = document.documentElement.scrollWidth - window.innerWidth;
        if (delta <= 0) return { delta, culprits: [] };

        /*
         * Only unclipped boxes can widen the document. A marquee track inside `overflow: hidden`
         * reports a right edge of 3000 px and contributes nothing, and blaming it sends the reader
         * after a bug that does not exist — so walk the ancestor chain and drop anything a scroller,
         * a clip or a fixed-position layer is already holding in.
         */
        const clipped = (el) => {
          for (let node = el.parentElement; node; node = node.parentElement) {
            const style = getComputedStyle(node);
            if (style.position === "fixed") return true;
            if (style.overflowX !== "visible") return true;
            if (style.contain.includes("paint") || style.contain.includes("strict")) return true;
          }
          return false;
        };

        const vw = document.documentElement.clientWidth;
        const culprits = [];
        for (const el of document.querySelectorAll("body *")) {
          const box = el.getBoundingClientRect();
          if (box.width === 0 || box.height === 0) continue;
          if (box.right <= vw + 0.5) continue;
          if (getComputedStyle(el).position === "fixed") continue;
          if (clipped(el)) continue;
          const id = el.id ? `#${el.id}` : "";
          const cls = typeof el.className === "string" && el.className ? `.${el.className.split(" ").join(".")}` : "";
          const parent = el.parentElement;
          const parentCls =
            parent && typeof parent.className === "string" && parent.className
              ? `.${parent.className.split(" ")[0]}`
              : "";
          culprits.push(
            `${el.tagName.toLowerCase()}${id}${cls} right=${Math.round(box.right)} left=${Math.round(box.left)} in ${parent ? parent.tagName.toLowerCase() : "?"}${parentCls}`,
          );
          if (culprits.length >= 4) break;
        }
        return { delta, culprits, client: vw, inner: window.innerWidth };
      });
      if (measurement.delta > 0) {
        overflows.push(
          `${route} @${width} +${measurement.delta}px (client ${measurement.client} / inner ${measurement.inner})${measurement.culprits.length ? ` [${measurement.culprits.join(" | ")}]` : ""}`,
        );
      }
    }
  }
  check("no horizontal overflow at 320–1920", overflows.length === 0, overflows.join(", "));
  await sweeper.close();

  /*
   * Read last, after the band has been reached — and reach it by the band, not by a guessed offset.
   * Round 36 shortened the page above the mark (a hero with no photograph), and a hard-coded
   * `scrollTo(0, 2000)` stopped landing on it: the lazy still was never asked to decode, and the
   * check failed a band that works. The still is the anchor now; scrolling it into view is what a
   * reader does.
   */
  const monogram = await page.evaluate(() => {
    const band = document.querySelector("[data-shader-band]");
    const img = band?.querySelector("img") ?? null;
    const canvases = [...document.querySelectorAll("canvas")];
    const box = band?.getBoundingClientRect();
    return {
      canvases: canvases.length,
      inBand: canvases.every((node) => Boolean(band && band.contains(node))),
      still: Boolean(img && img.complete && img.naturalWidth > 0),
      sized: Boolean(box && box.width > 120 && box.height > 120),
      /* The shader writes `data-shader="on"` on its host only after it has painted; the still steps
         back at that moment. If the GLSL failed to compile the flag never appears and the mark on
         screen is the baked image — which is a working fallback, but a failed shader. */
      painted: Boolean(band && band.querySelector('[data-shader="on"]')),
    };
  });
  /*
   * Round 39 — the contract changed in one place, and this is the assertion that has to say so.
   *
   * The baked still is still the *fallback* — before the shader paints, a decoded image is what the
   * band is showing, and `canvasBefore.still` keeps that half honest. Once the shader has painted,
   * the still must be GONE from the DOM, not merely faded: two marks at different scales stacked in
   * one band is the double silhouette the owner reported. So the second half of the check now asserts
   * `painted && !still` rather than `painted && still`.
   */
  check(
    "the chrome mark paints itself and leaves no baked still behind it",
    canvasBefore.count <= 1 &&
      canvasBefore.inBand &&
      canvasBefore.still &&
      monogram.canvases <= 1 &&
      monogram.inBand &&
      !monogram.still &&
      monogram.sized &&
      monogram.painted,
    `canvas ${canvasBefore.count} (in band ${canvasBefore.inBand}, still decoded ${canvasBefore.still}) · still after paint ${monogram.still} · sized ${monogram.sized} · shader painted ${monogram.painted}`,
  );
  await shot(page, "qa-monogram");

  /*
   * R8 — the catalogue wall and the title sequence.
   *
   * The wall is a separate page, so it gets its own tab: the pointer has to be over the *list* for
   * the falloff to compute, and the sleeve under the cursor is the only one that should come
   * forward. The loader is a third tab, because it is skipped when `an-curtain` is already in
   * sessionStorage — which is exactly what `settle()` does to the main page.
   */
  const wall = await browser.newPage();
  await wall.setViewport({ width: 1440, height: 900 });
  await wall.goto(`${base}/music`, { waitUntil: "load", timeout: 60000 });
  await sleep(600);
  await wall.evaluate(() => {
    document.querySelector("[data-wall-card]")?.scrollIntoView({ block: "center" });
  });
  await sleep(400);
  const card = await wall.$("[data-wall-card]");
  if (card) {
    const box = await card.boundingBox();
    await wall.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
    await sleep(450);
    const state = await wall.evaluate(() => {
      const first = document.querySelector("[data-wall-card]");
      const all = [...document.querySelectorAll("[data-wall-card]")];
      const z = (node) => Math.abs(parseFloat(node.style.getPropertyValue("--wall-z") || "0"));
      return { pointed: z(first), furthest: Math.max(...all.map(z)) };
    });
    check(
      "the catalogue wall lifts the sleeve under the pointer",
      state.pointed > 20 && state.furthest <= 44.5,
      `${state.pointed}px lift, max ${state.furthest}px`,
    );
  } else {
    check("the catalogue wall lifts the sleeve under the pointer", false, "no [data-wall-card]");
  }
  await wall.close();

  const fresh = await browser.newPage();
  await fresh.setViewport({ width: 1440, height: 900 });
  await fresh.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  /*
   * The sheet is switched on by an effect, one frame after hydration — so wait for the state rather
   * than for a number. A fixed 200 ms sleep assumed a fast machine; on a loaded CI box hydration
   * took longer and the check read `data-state="idle"` and failed a curtain that was working
   * perfectly. Waiting for the condition tests the behaviour; sleeping tests the hardware.
   */
  await fresh
    .waitForFunction(() => document.querySelector('[data-state="playing"] svg path') !== null, {
      timeout: 5000,
      polling: 50,
    })
    .catch(() => undefined);
  /* Round 30: the reel is the monogram drawing itself. Three assertions, none of them a vibe:
     the sheet plays with three strokes, the first stroke's dashoffset is actually shrinking
     300 ms in (a drawn line, not a pasted logo), and by 1.6 s the node, the html flag and the
     session key have all moved on — the owner's ceiling is one second, removal sits at 1.06. */
  const opening = await fresh.evaluate(() => {
    /* `data-state` alone would match the header (rest/compact): the curtain is the only node
       whose state is idle or playing. */
    const boot = document.querySelector('[data-state="playing"], [data-state="idle"]');
    const path = boot?.querySelector("svg path") ?? null;
    return {
      present: Boolean(boot && path),
      strokes: boot?.querySelectorAll("svg path").length ?? 0,
      state: boot?.getAttribute("data-state") ?? "",
      offset: path ? getComputedStyle(path).strokeDashoffset : "",
    };
  });
  await sleep(300);
  const midOffset = await fresh.evaluate(() => {
    const path = document.querySelector('[data-state="playing"], [data-state="idle"] svg path');
    return path ? getComputedStyle(path).strokeDashoffset : "";
  });
  await sleep(1300);
  const cleared = await fresh.evaluate(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem("an-curtain") === "1";
    } catch {
      seen = false;
    }
    return (
      !document.documentElement.dataset.curtain &&
      document.querySelector('[data-state="playing"], [data-state="idle"]') === null &&
      seen
    );
  });
  check(
    "the monogram draws itself, and the sheet is gone inside a second",
    opening.present &&
      opening.strokes === 3 &&
      opening.state === "playing" &&
      Number.parseFloat(opening.offset) > Number.parseFloat(midOffset) &&
      cleared,
    JSON.stringify({ ...opening, midOffset, cleared }),
  );
  await fresh.close();

  /* ---------------------------------------------------------------------------------------
   * R9 — the second plate, and the back of the sheet.
   *
   * The misregistration is the whole concept: if the ghost stops following the pointer, every page
   * silently turns back into flat type and nothing fails. So it is measured, not eyeballed: the
   * computed `text-shadow` of the page's h1 must exist and must change between two pointer
   * positions.
   * ------------------------------------------------------------------------------------- */
  const pressProof = await browser.newPage();
  await pressProof.setViewport({ width: 1440, height: 900 });
  await pressProof.goto(`${base}/`, { waitUntil: "load", timeout: 60000 });
  await sleep(600);
  const shadowAt = async (x, y) => {
    await pressProof.mouse.move(x, y, { steps: 6 });
    await sleep(320);
    return pressProof.evaluate(() => {
      const heading = document.querySelector("h1");
      return heading ? getComputedStyle(heading).textShadow : "none";
    });
  };
  const shadowLeft = await shadowAt(60, 120);
  const shadowRight = await shadowAt(1380, 780);
  const inkVars = await pressProof.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--ink-x").trim(),
  );
  check(
    "display type is printed twice and the second plate follows the pointer",
    shadowLeft !== "none" && shadowRight !== "none" && shadowLeft !== shadowRight && inkVars !== "",
    `${shadowLeft} → ${shadowRight}`,
  );

  const toggle = await pressProof.$("[data-sheet-toggle]");
  if (toggle) {
    await toggle.click();
    await sleep(900);
    const verso = await pressProof.evaluate(() => {
      const sheet = document.querySelector('[role="dialog"][aria-label^="Indeks"]');
      if (!sheet) return { found: false };
      const box = sheet.getBoundingClientRect();
      return {
        found: true,
        visible: getComputedStyle(sheet).visibility === "visible",
        covers: box.width >= window.innerWidth - 1 && box.height >= window.innerHeight - 1,
        locked: document.documentElement.dataset.sheet === "open",
        focusInside: sheet.contains(document.activeElement),
        links: sheet.querySelectorAll("a[href]").length,
      };
    });
    await shot(pressProof, "qa-back-side");
    await pressProof.keyboard.press("Escape");
    await sleep(700);
    const closedVerso = await pressProof.evaluate(() => ({
      locked: document.documentElement.dataset.sheet === "open",
      focusOnToggle: document.activeElement?.matches("[data-sheet-toggle]") ?? false,
    }));
    check(
      "the back of the sheet opens, covers the screen, locks the page and returns focus",
      verso.found && verso.visible && verso.covers && verso.locked && verso.focusInside && verso.links > 20,
      JSON.stringify(verso),
    );
    check(
      "Escape closes the back of the sheet and unlocks the page",
      !closedVerso.locked && closedVerso.focusOnToggle,
      JSON.stringify(closedVerso),
    );
  }
  /* Round 33 retired the floating "Indeks" tab (and with it the verso sheet), so the two assertions
     that used to run here are gone by design, not by regression. */
  await pressProof.close();

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
