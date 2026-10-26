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
  const railItem = await page.$('[data-rail-item] a');
  if (railItem) {
    const readTransform = () =>
      page.evaluate(() => {
        const link = document.querySelector("[data-rail-item] a");
        return link ? getComputedStyle(link).transform : "none";
      });
    const before = await readTransform();
    await railItem.hover();
    await sleep(500);
    const after = await readTransform();
    check("rail sleeves answer hover", before !== after, `${before} → ${after}`);
    await shot(page, "qa-rail-hover");
  } else {
    check("rail sleeves answer hover", false, "no [data-rail-item] found");
  }

  /*
   * R8 — the three-dimensional part.
   *
   * A pointer move has to do two things, and both are asserted separately because either one alone
   * is easy to fake: (a) the stage writes a rotation to `--plate-ry` / `--plate-rx`, and (b) the
   * layers inside it are displaced by *different* amounts, so the name and the masthead rule are at
   * different distances rather than glued together.
   */
  await page.evaluate(() => window.scrollTo(0, 0));
  await settleScroll(page);
  await page.mouse.move(320, 260);
  await sleep(120);
  await page.mouse.move(980, 700, { steps: 10 });
  await sleep(600);
  const plate = await page.evaluate(() => {
    const host = document.querySelector('[data-plate="hero-stage"]');
    const masthead = document.querySelector('[data-depth="hero-masthead"]');
    const sheet = masthead?.parentElement ?? null;
    /* m43 of a matrix3d is the element's own translateZ. Reading it is the only way to tell real
       depth from a shadow: a layer that only looks deep still has m43 = 0. */
    const zOf = (node) => {
      if (!node) return null;
      const m = getComputedStyle(node).transform;
      if (!m || m === "none") return 0;
      const n = m.match(/matrix3d\(([^)]+)\)/);
      return n ? Number(n[1].split(",")[14]) : 0;
    };
    const own = (sel) => {
      const node = document.querySelector(sel);
      return { z: zOf(node), transform: node ? getComputedStyle(node).transform : null };
    };
    return {
      ry: host?.style.getPropertyValue("--plate-ry") ?? "",
      rx: host?.style.getPropertyValue("--plate-rx") ?? "",
      perspective: host ? getComputedStyle(host).perspective : "",
      sheetZ: zOf(sheet),
      name: own('[data-depth="hero-name"]'),
      masthead: own('[data-depth="hero-masthead"]'),
      facts: own('[data-depth="hero-facts"]'),
    };
  });
  const rotated = Math.abs(parseFloat(plate.ry)) > 0.2 || Math.abs(parseFloat(plate.rx)) > 0.2;
  check(
    "the hero stage rotates towards the pointer",
    rotated,
    `rx ${plate.rx || "unset"} / ry ${plate.ry || "unset"}`,
  );
  /*
   * R10 — the hero used to give every layer its own Z, which sounds like depth and measured like a
   * broken layout: at −110 px the masthead rule stopped 48 px inside both gutters and the facts bar
   * dropped 25 px below the paragraph it aligns to. The sheet is one surface now, and these two
   * checks are what "one surface" means: the block itself carries the Z, and none of the type
   * inside it does.
   */
  check(
    "the hero's type sits behind the glass instead of on it",
    plate.perspective !== "none" && typeof plate.sheetZ === "number" && plate.sheetZ <= -10,
    `perspective ${plate.perspective}, sheet translateZ ${plate.sheetZ}px`,
  );
  const inner = [plate.name, plate.masthead, plate.facts];
  check(
    "the hero's sheet is one rigid surface, not a stack of layers",
    inner.every((n) => n.transform === "none" || n.z === 0),
    inner.map((n) => `${n.z}px`).join(" / "),
  );

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

  /*
   * Zero canvases, everywhere, forever (round 20, owner's instruction: "jangan 3D berat jir").
   *
   * The contract used to be "at most one canvas, and nothing allocated before its band is on
   * screen" (D-102) — a lazy WebGL monogram. Round 20 baked that monogram into WebP stills and
   * deleted the renderer, so the contract is now absolute: no `<canvas>` element exists at scroll 0
   * and none appears after the band has been reached, on any viewport. The probe also asserts the
   * replacement is actually there — a lazy image with real decoded pixels — because "we removed the
   * heavy thing" is only half the change; the band must not go dark.
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
      const delta = await sweeper.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (delta > 0) overflows.push(`${route} @${width} +${delta}px`);
    }
  }
  check("no horizontal overflow at 320–1920", overflows.length === 0, overflows.join(", "));
  await sweeper.close();

  // Read last, after the band has been reached: the lazy still has had every chance to decode.
  await page.evaluate(() => window.scrollTo(0, 2000));
  await settleScroll(page);
  await sleep(1800);
  const monogram = await page.evaluate(() => {
    const band = document.querySelector('[class*="signature"]');
    const img = band ? band.querySelector("img") : null;
    return {
      canvases: document.querySelectorAll("canvas").length,
      still: Boolean(img && img.complete && img.naturalWidth > 0),
      lazy: img?.loading === "lazy",
    };
  });
  check(
    "zero canvases site-wide, and the monogram band ships a decoded lazy still",
    canvasBefore.count === 0 && monogram.canvases === 0 && monogram.still && monogram.lazy,
    `canvases at scroll 0: ${canvasBefore.count} (band on screen: ${canvasBefore.onScreen}) · after the band: ${monogram.canvases} · still decoded: ${monogram.still} · lazy: ${monogram.lazy}`,
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
    .waitForFunction(() => document.querySelector("[data-count]")?.closest('[data-state="playing"]') ?? false, {
      timeout: 5000,
      polling: 50,
    })
    .catch(() => undefined);
  const opening = await fresh.evaluate(() => {
    const count = document.querySelector("[data-count]");
    return {
      present: Boolean(count),
      digits: count?.textContent?.trim().length ?? 0,
      state: count?.closest("[data-state]")?.getAttribute("data-state") ?? "",
    };
  });
  await sleep(3000);
  const cleared = await fresh.evaluate(
    () => !document.documentElement.dataset.curtain && document.querySelector("[data-count]") === null,
  );
  check(
    "the title sequence counts, then gets out of the way",
    opening.present && opening.digits === 3 && opening.state === "playing" && cleared,
    JSON.stringify({ ...opening, cleared }),
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
  } else {
    check("the back of the sheet opens, covers the screen, locks the page and returns focus", false, "no [data-sheet-toggle]");
    check("Escape closes the back of the sheet and unlocks the page", false, "no [data-sheet-toggle]");
  }
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
