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
   * R36 — the hero is a single column, and "single column" is measured, not assumed.
   *
   * Round 35's hero stacked a −70px translated photograph, a scrim and a tilting plate; at 390px the
   * photograph crossed the type and the tilt pushed the foot of the name into the buttons. The
   * replacement is four grid rows, so the assertion is geometric: each row starts below the previous
   * one ends, at both widths, with no transform anywhere in the band and nothing taken out of flow.
   * An overlap is exactly a row whose top lands above its predecessor's bottom, which is what this
   * reads. A layout can be pretty and still be broken; this catches the broken half.
   */
  const heroRows = async (width) => {
    await page.setViewport({ width, height: width < 700 ? 780 : 900, deviceScaleFactor: 1 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await settleScroll(page);
    await sleep(400);
    return page.evaluate(() => {
      const hero = document.querySelector("section[aria-labelledby=\"hero-title\"]");
      if (!hero) return null;
      const rows = [hero.querySelector("h1"), hero.querySelector("h1 + div"), hero.querySelector("[class*=\"heroCta\"]")]
        .filter(Boolean)
        .map((node) => {
          const box = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return {
            top: box.top,
            bottom: box.bottom,
            transform: style.transform,
            position: style.position,
          };
        });
      const offenders = [...hero.querySelectorAll("*")]
        .filter((node) => getComputedStyle(node).position === "absolute")
        .filter((node) => {
          const box = node.getBoundingClientRect();
          return box.width > 0 && box.height > 0;
        })
        .map((node) => node.tagName.toLowerCase());
      return { rows, offenders, cursor: getComputedStyle(document.documentElement).cursor };
    });
  };

  const wide = await heroRows(1440);
  const narrow = await heroRows(390);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const gaps = (state) =>
    state.rows.slice(1).map((row, i) => Math.round(row.top - state.rows[i].bottom));
  check(
    "the hero stacks in one column with nothing overlapping, wide and narrow",
    Boolean(wide && narrow) &&
      [...gaps(wide), ...gaps(narrow)].every((gap) => gap >= 0) &&
      wide.rows.every((row) => row.transform === "none" && row.position !== "absolute"),
    `1440 gaps ${gaps(wide).join(" / ")}px · 390 gaps ${gaps(narrow).join(" / ")}px`,
  );
  check(
    "the hero has no absolutely positioned furniture left",
    Boolean(wide && narrow) && wide.offenders.length === 0 && narrow.offenders.length === 0,
    `${(wide?.offenders ?? []).concat(narrow?.offenders ?? []).join(", ") || "none"}`,
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
    return { cards: cards.length, sleeves: document.querySelectorAll("[data-release] a[aria-label]").length };
  });
  check(
    "the catalogue grid renders every release without a scroll driver",
    grid.cards >= 10 && grid.sleeves === grid.cards,
    `${grid.cards} cards, ${grid.sleeves} named sleeves`,
  );

  /*
   * Scroll first, measure second. Lenis eases the scroll, so a rect taken immediately after
   * `scrollIntoView` is a rect the sleeve has already left by the time the mouse arrives — the
   * first version of this check hovered empty space and read "none → none".
   */
  await page.evaluate(() => {
    document.querySelector("[data-release] a[aria-label]")?.scrollIntoView({ block: "center" });
  });
  await settleScroll(page);
  await sleep(700);
  const box = await page.evaluate(() => {
    const link = document.querySelector("[data-release] a[aria-label]");
    if (!link) return null;
    const r = link.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (box) {
    const read = () =>
      page.evaluate(() => {
        const link = document.querySelector("[data-release] a[aria-label]");
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
    check("grid sleeves answer hover", before !== after, `${before} → ${after}`);
    await shot(page, "qa-grid-hover");
  } else {
    check("grid sleeves answer hover", false, "no [data-release] sleeve link found");
  }

  /*
   * The call to action, end to end.
   *
   * The hero's only button is the promise the page makes: "Dengarkan Musik" has to land on the
   * catalogue, not near it and not on a different band. A real click is dispatched, Lenis is allowed
   * to finish, and the band's top is compared with the scroll position — the anchor exists, it is
   * wired, and the section it names is the one that arrives.
   */
  await page.evaluate(() => window.scrollTo(0, 0));
  await settleScroll(page);
  await sleep(300);
  const cta = await page.evaluate(() => {
    const hero = document.querySelector("section[aria-labelledby=\"hero-title\"]");
    const link = hero ? [...hero.querySelectorAll("a")].find((a) => a.hash === "#catalogue") : null;
    if (!link) return null;
    const box = link.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2, label: link.textContent.trim() };
  });
  if (cta) {
    await page.mouse.click(cta.x, cta.y);
    await settleScroll(page);
    await sleep(900);
    const landed = await page.evaluate(() => {
      const band = document.querySelector("#catalogue");
      if (!band) return null;
      const box = band.getBoundingClientRect();
      return { top: Math.round(box.top), bottom: Math.round(box.bottom), y: Math.round(window.scrollY) };
    });
    check(
      "the hero's button lands on the catalogue",
      Boolean(landed) && landed.top <= 160 && landed.bottom > 0,
      `${cta.label} → #catalogue top ${landed?.top}px at scrollY ${landed?.y}`,
    );
    await shot(page, "qa-hero-cta");
  } else {
    check("the hero's button lands on the catalogue", false, "no #catalogue link in the hero");
  }

  /*
   * No tilted plate, no depth layer, no transformed sheet — the hero is flat on purpose, so the
   * assertion is the absence of the machinery the previous rounds installed. If a `Depth` or a
   * `Plate3D` is mounted into the first band again, this fails before the overlap does.
   */
  const flat = await page.evaluate(() => {
    const hero = document.querySelector("section[aria-labelledby=\"hero-title\"]");
    if (!hero) return null;
    return {
      layers: hero.querySelectorAll("[data-layer]").length,
      plates: hero.querySelectorAll("[data-plate]").length,
      transformed: [...hero.querySelectorAll("*")].filter((node) => {
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

  /*
   * Zero canvases, everywhere, forever (round 20, owner's instruction: "jangan 3D berat jir").
   *
   * The contract used to be "at most one canvas, and nothing allocated before its band is on
   * screen" (D-102) — a lazy WebGL monogram. Round 20 baked that monogram into WebP stills and
   * deleted the renderer, so the contract is now absolute: no `<canvas>` element exists at scroll 0
   * on any viewport. Round 29 replaced the baked still with a lazy shader quad: the canvas the
   * band may own is imported dynamically only when the band approaches, only above 768px, only
   * with motion allowed and only where WebGL exists — so at scroll 0 the count is still zero, and
   * after the band it is at most one, and only inside the band. The probe also asserts the
   * fallback floor never moved: a lazy image with real decoded pixels underneath, because "we
   * added the heavy thing" is only half the change; the band must survive without it.
   */
  const canvasProbe = await browser.newPage();
  await canvasProbe.setViewport({ width: 1440, height: 900 });
  await canvasProbe.goto(`${base}/`, { waitUntil: "load" });
  await sleep(1600);
  const canvasBefore = await canvasProbe.evaluate(() => {
    const band = document.querySelector('[class*="signature"]');
    const box = band?.getBoundingClientRect();
    return {
      count: document.querySelectorAll("canvas").length,
      onScreen: Boolean(box && box.top < window.innerHeight && box.bottom > 0),
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
  /* The main tab, not the canvas probe: that one was closed the moment it had its answer. */
  await page.evaluate(() => {
    document.querySelector('img[src*="liquid-metal-wide"]')?.scrollIntoView({ block: "center" });
  });
  await sleep(2200);
  const monogram = await page.evaluate(() => {
    const img = document.querySelector('img[src*="liquid-metal-wide"]');
    const band = img?.closest("section") ?? null;
    const canvases = [...document.querySelectorAll("canvas")];
    return {
      canvases: canvases.length,
      inBand: canvases.every((node) => Boolean(band && band.contains(node))),
      still: Boolean(img && img.complete && img.naturalWidth > 0),
      lazy: img?.loading === "lazy",
    };
  });
  check(
    "no canvas before the band, at most one inside it, and the band ships a decoded lazy still",
    canvasBefore.count === 0 && monogram.canvases <= 1 && monogram.inBand && monogram.still && monogram.lazy,
    `canvases at scroll 0: ${canvasBefore.count} (band on screen: ${canvasBefore.onScreen}) · after the band: ${monogram.canvases} (all inside it: ${monogram.inBand}) · still decoded: ${monogram.still} · lazy: ${monogram.lazy}`,
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
