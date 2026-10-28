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
 *  12. (Langkah 3e) the header's booking control really writes the address to the clipboard, says so
 *      for its duration, puts itself back, and falls back to selectable text when the write is
 *      refused — with the clipboard permission granted, so the pass is a write that happened and
 *      not a check that was skipped.
 *  13. (Langkah 3f) the homepage's Bottom Release HUD prints the catalogue's own first release, is
 *      absent at scroll 0 so it cannot eat the hero's logistics strip, appears once the reader has
 *      moved, never overlaps the INDEKS tab, and does not exist at all on a phone.
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
  /*
   * Round 29 — the rail is a pinned reel: the engine writes --pin across the wrapper's 200vh of
   * travel and the stylesheet turns it into one translateX. Asserted from both ends: the number
   * moves, and the row visibly moves with it. Then the sleeve still answers the hand.
   */
  const pinWrap = await page.$("[data-catalogue-pin]");
  if (pinWrap) {
    await page.evaluate(() => {
      const wrap = document.querySelector("[data-catalogue-pin]");
      const top = wrap.getBoundingClientRect().top + window.scrollY;
      const span = wrap.getBoundingClientRect().height - window.innerHeight;
      window.scrollTo(0, top + span * 0.55);
    });
    await settleScroll(page);
    await sleep(400);
    const pinned = await page.evaluate(() => {
      const wrap = document.querySelector("[data-catalogue-pin]");
      const row = wrap?.firstElementChild;
      const m = row ? new DOMMatrixReadOnly(getComputedStyle(row).transform) : null;
      return {
        pin: Number(getComputedStyle(wrap).getPropertyValue("--pin")),
        tx: m ? m.m41 : 0,
      };
    });
    check(
      "the pinned catalogue reel translates as --pin crosses the band",
      pinned.pin > 0.4 && pinned.pin < 0.7 && pinned.tx < -100,
      `--pin ${pinned.pin.toFixed(4)} · translateX ${pinned.tx.toFixed(1)}px`,
    );
    await shot(page, "qa-pin-reel");

    /* Mid-travel the first card is off screen — the row has translated. Hover the card that is
       actually under the reader: find one fully inside the viewport, mark it, aim the mouse. */
    const cardBox = await page.evaluate(() => {
      const links = [...document.querySelectorAll("[data-pin-card] a")];
      for (const link of links) {
        const r = link.getBoundingClientRect();
        if (r.left > 24 && r.right < window.innerWidth - 24 && r.top > 24 && r.bottom < window.innerHeight - 24) {
          link.setAttribute("data-qa-hover", "");
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
      }
      return null;
    });
    if (cardBox) {
      const readTransform = () =>
        page.evaluate(() => {
          const link = document.querySelector("[data-qa-hover]");
          return link ? getComputedStyle(link).transform : "none";
        });
      const before = await readTransform();
      await page.mouse.move(cardBox.x, cardBox.y, { steps: 6 });
      await sleep(500);
      const after = await readTransform();
      check("reel sleeves answer hover", before !== after, `${before} → ${after}`);
      await shot(page, "qa-rail-hover");
    } else {
      check("reel sleeves answer hover", false, "no [data-pin-card] link inside the viewport at mid-travel");
    }
  } else {
    check("the pinned catalogue reel translates as --pin crosses the band", false, "no [data-catalogue-pin] found");
    check("reel sleeves answer hover", false, "no [data-catalogue-pin] found");
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
  /*
   * R31 — the catalogue band above mounts a real WebGL object when it is seen, and compiling its
   * physical material plus the environment bake blocks the main thread for a beat afterwards (long
   * on software GL). Measuring the tilt inside that beat reads a half-finished lerp and fails a
   * component that works, so the gesture waits until ten consecutive frames arrive on time again.
   * The assertion below is untouched: it still demands a real rotation.
   */
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let good = 0;
        let prev = performance.now();
        const loop = (now) => {
          good = now - prev < 50 ? good + 1 : 0;
          prev = now;
          if (good >= 10) return resolve(null);
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
        setTimeout(() => resolve(null), 8000);
      }),
  );
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

  /* ------------------------------------------------------ booking quick-copy (Langkah 3e) */
  /*
   * The clipboard is the one behaviour a screenshot cannot prove, and headless Chromium refuses the
   * write unless the origin is granted permission — the exact "it does not work in the sandbox"
   * failure that must be solved rather than skipped.
   *
   * `browser.defaultBrowserContext().overridePermissions(base, ["clipboard-read", "clipboard-write"])`
   * is the obvious call and it is not enough: measured, it leaves `clipboard-write` **denied**
   * (`navigator.permissions.query` → "denied", `writeText` → NotAllowedError) while granting read.
   * The permission names the CDP endpoint actually honours are `clipboardReadWrite` and
   * `clipboardSanitizedWrite`, and with those the write lands. The assertion after the click is on
   * the text the browser really received, not on a stub.
   */
  const cdp = await browser.target().createCDPSession();
  await cdp.send("Browser.grantPermissions", {
    origin: base,
    permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"],
  });

  const booking = await browser.newPage();
  await booking.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await booking.goto(`${base}/`, { waitUntil: "load" });
  await sleep(900);

  const readBooking = () =>
    booking.evaluate(() => {
      const button = document.querySelector("[data-booking-copy]");
      if (!button) return null;
      const spans = [...button.querySelectorAll("span")].map((node) => ({
        text: (node.textContent || "").replace(/\s+/g, " ").trim(),
        opacity: getComputedStyle(node).opacity,
      }));
      const exact = (want) => spans.find((span) => span.text === want);
      const status = document.querySelector("[data-booking-status]");
      const email = document.querySelector("[data-booking-fallback] [class*='fallbackEmail']");
      return {
        tag: button.tagName,
        state: button.dataset.copyState,
        name: button.getAttribute("aria-label") || "",
        radius: getComputedStyle(button).borderTopLeftRadius,
        width: Math.round(button.getBoundingClientRect().width * 10) / 10,
        height: Math.round(button.getBoundingClientRect().height),
        idleLabel: exact("Booking"),
        doneLabel: exact("\u2713 Email disalin"),
        live: status?.getAttribute("aria-live") ?? null,
        statusText: (status?.textContent || "").trim(),
        fallback: (document.querySelector("[data-booking-fallback]")?.textContent || "").trim(),
        fallbackSelect: email ? getComputedStyle(email).userSelect : null,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
      };
    });

  const liveBooking = await readBooking();
  check(
    "the header has a booking copy control, named, hairline, with a polite live region",
    Boolean(liveBooking) &&
      liveBooking.tag === "BUTTON" &&
      /salin alamat email ke clipboard/i.test(liveBooking.name) &&
      liveBooking.name.includes("akbarnawasunda@gmail.com") &&
      liveBooking.radius === "0px" &&
      liveBooking.live === "polite" &&
      liveBooking.idleLabel?.opacity === "1",
    liveBooking
      ? `${liveBooking.tag} · "${liveBooking.idleLabel?.text}" · radius ${liveBooking.radius} · aria-live ${liveBooking.live} · ${liveBooking.width}px`
      : "no [data-booking-copy]",
  );

  await booking.click("[data-booking-copy]");
  /* 400 ms: the label crossfade is 150 ms and starts once the promise resolves, so 220 ms caught it
     at opacity 0.968 and failed an assertion that was measuring a transition, not a state. */
  await sleep(400);
  const clipboardText = await booking.evaluate(() => navigator.clipboard.readText());
  const afterClick = await readBooking();
  check(
    "clicking it copies the published address and shows the confirmation",
    clipboardText === "akbarnawasunda@gmail.com" &&
      afterClick.state === "copied" &&
      /^Email disalin/.test(afterClick.name) &&
      Number(afterClick.doneLabel?.opacity) > 0.99 &&
      Number(afterClick.idleLabel?.opacity) < 0.01 &&
      afterClick.statusText.length > 0,
    `clipboard="${clipboardText}" · state=${afterClick.state} · label "${afterClick.doneLabel?.text}" ${afterClick.doneLabel?.opacity} · status "${afterClick.statusText}"`,
  );
  check(
    "the confirmation does not reflow the bar",
    afterClick.width === liveBooking.width,
    `${liveBooking.width}px → ${afterClick.width}px`,
  );
  await shot(booking, "booking-copied");

  await sleep(2100);
  const afterReset = await readBooking();
  check(
    "the confirmation clears itself after the 1.8 s window",
    afterReset.state === "idle" && afterReset.idleLabel?.opacity === "1" && afterReset.statusText === "",
    `state=${afterReset.state} · idle opacity ${afterReset.idleLabel?.opacity}`,
  );

  /* Refusal path. The permission is granted above, so the rejection is injected: what is being
     proved is that a rejected write is caught and the address is put on screen, not that Chrome
     happens to agree with us. */
  await booking.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      configurable: true,
      value: () => Promise.reject(new DOMException("Write permission denied.", "NotAllowedError")),
    });
  });
  await booking.click("[data-booking-copy]");
  await sleep(300);
  const denied = await readBooking();
  check(
    "a refused clipboard write shows the address as selectable text instead of failing silently",
    denied.state === "failed" &&
      denied.fallback.includes("akbarnawasunda@gmail.com") &&
      denied.fallbackSelect === "all" &&
      /disalin manual/i.test(denied.statusText),
    `state=${denied.state} · panel "${denied.fallback}" · user-select ${denied.fallbackSelect}`,
  );
  await shot(booking, "booking-fallback");

  await booking.keyboard.press("Escape");
  await sleep(160);
  const dismissed = await readBooking();
  check(
    "Escape dismisses the manual-copy panel",
    dismissed.state === "idle" && dismissed.fallback === "",
    `state=${dismissed.state}`,
  );
  await booking.close();

  /* Reduced motion: the confirmation may still appear, but with no transition at all. */
  const bookingStill = await browser.newPage();
  await bookingStill.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await bookingStill.setViewport({ width: 1440, height: 900 });
  await bookingStill.goto(`${base}/`, { waitUntil: "load" });
  await sleep(700);
  const stillDurations = await bookingStill.evaluate(() => {
    const button = document.querySelector("[data-booking-copy]");
    const spans = [...button.querySelectorAll("span")];
    const done = spans.find((node) => (node.textContent || "").replace(/\s+/g, " ").trim() === "\u2713 Email disalin");
    return done ? getComputedStyle(done).transitionDuration : null;
  });
  /*
   * 1 ms, not 0 s: `globals.css` ends with `*, *::before, *::after { transition-duration: 1ms
   * !important }` under reduce, and an `!important` in the global sheet outranks the component's own
   * `transition: none`. What matters is that the swap is imperceptible, so the check is "no duration
   * worth animating", and the number is printed rather than rounded away.
   */
  const stillSeconds = stillDurations === null ? null : Number.parseFloat(stillDurations);
  check(
    "the confirmation transition is effectively instant under prefers-reduced-motion",
    stillSeconds !== null && Number.isFinite(stillSeconds) && stillSeconds <= 0.001,
    `transition-duration ${stillDurations} (global 1 ms guard)`,
  );
  await bookingStill.close();

  /* Phone geometry: a 40px square that fits the 63px of slack the bar actually has. */
  const bookingPhone = await browser.newPage();
  await bookingPhone.setViewport({ width: 390, height: 844 });
  await bookingPhone.goto(`${base}/`, { waitUntil: "load" });
  await sleep(800);
  const phoneGeometry = await bookingPhone.evaluate(() => {
    const button = document.querySelector("[data-booking-copy]");
    const rect = button.getBoundingClientRect();
    const bar = document.querySelector("header > div").getBoundingClientRect();
    const brand = document.querySelector("header a")?.getBoundingClientRect();
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      insideBar: rect.top >= bar.top && rect.bottom <= bar.bottom && rect.left >= bar.left && rect.right <= bar.right,
      clearsBrand: brand ? Math.round(rect.left - brand.right) : null,
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  check(
    "the phone renders a 40px copy square inside the bar, clear of the mark",
    phoneGeometry.width === 40 && phoneGeometry.height === 40 && phoneGeometry.insideBar && (phoneGeometry.clearsBrand ?? 0) > 0 && phoneGeometry.overflowX <= 0,
    JSON.stringify(phoneGeometry),
  );

  /* ------------------------------------------------- bottom release HUD (Langkah 3f) */
  /*
   * The HUD is a fixed card, so it is the one new element that could plausibly break three things at
   * once: the fold the hero just won (3c), the INDEKS tab on the right edge, and the "no horizontal
   * overflow" contract. All three are measured here rather than eyeballed in a screenshot.
   */
  const hudPage = await browser.newPage();
  await hudPage.setViewport({ width: 1440, height: 900 });
  await hudPage.goto(`${base}/`, { waitUntil: "load" });
  await sleep(1500);

  const hudAtTop = await hudPage.evaluate(() => {
    const hud = document.querySelector("[data-release-hud]");
    const strip = document.querySelector('[data-depth="hero-facts"]');
    return {
      inDom: Boolean(hud),
      stripBottom: strip ? Math.round(strip.getBoundingClientRect().bottom) : null,
    };
  });
  check(
    "the HUD is absent at scroll 0, so the hero's logistics strip keeps its fold",
    !hudAtTop.inDom,
    `in DOM: ${hudAtTop.inDom} · hero strip bottom ${hudAtTop.stripBottom}px`,
  );

  await hudPage.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 0.9)));
  await settleScroll(hudPage);
  await sleep(500);

  const hudShown = await hudPage.evaluate(() => {
    const hud = document.querySelector("[data-release-hud]");
    if (!hud) return { present: false };
    const box = (node) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    };
    const overlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const hudBox = box(hud);
    /* `[data-sheet-toggle]`, not a text or aria match: the INDEKS tab has no aria-label of its own
       (its name is the word inside it) and the only "Indeks" aria-label in the document belongs to
       the sheet dialog behind it — matching that measured an off-screen 834×2154 panel instead of
       the 29×83 tab on the right edge. Data hooks are what the rest of this file selects on. */
    const tab = document.querySelector("[data-sheet-toggle]");
    const header = document.querySelector("header");
    const action = hud.querySelector("a");
    const title = hud.querySelector("p:last-of-type");
    return {
      present: true,
      title: (title?.textContent || "").trim(),
      eyebrow: (hud.querySelector("p")?.textContent || "").replace(/\s+/g, " ").trim(),
      actionText: (action?.textContent || "").replace(/\s+/g, " ").trim(),
      actionHref: action?.getAttribute("href") || "",
      actionTarget: action?.getAttribute("target"),
      radius: getComputedStyle(hud).borderTopLeftRadius,
      zIndex: Number(getComputedStyle(hud).zIndex),
      tabZ: tab ? Number(getComputedStyle(tab).zIndex) : null,
      overlapsTab: tab ? overlap(hudBox, box(tab)) : null,
      overlapsHeader: header ? overlap(hudBox, box(header)) : null,
      inViewport: hudBox.left >= 0 && hudBox.right <= window.innerWidth && hudBox.bottom <= window.innerHeight,
      tabStops: [...document.querySelectorAll("a[href], button")].filter((node) => node.closest("[data-release-hud]")).length,
      landmark: hud.tagName,
      landmarkName: hud.getAttribute("aria-label"),
      audio: hud.querySelectorAll("audio, video").length,
    };
  });
  check(
    "the HUD prints the catalogue's own first release, as a named complementary landmark",
    hudShown.present &&
      hudShown.landmark === "ASIDE" &&
      Boolean(hudShown.landmarkName) &&
      hudShown.title.includes("Masih Mencintainya") &&
      /SoundCloud/i.test(hudShown.actionHref) &&
      hudShown.actionTarget === "_blank" &&
      hudShown.radius === "0px" &&
      hudShown.tabStops === 1,
    `${hudShown.landmark} "${hudShown.landmarkName}" · "${hudShown.title}" · ${hudShown.eyebrow} · ${hudShown.actionText} → ${hudShown.actionHref} · ${hudShown.tabStops} tab stop`,
  );
  check(
    "the HUD never overlaps the INDEKS tab or the header and stays inside the viewport",
    hudShown.present &&
      hudShown.overlapsTab === false &&
      hudShown.overlapsHeader === false &&
      hudShown.inViewport &&
      hudShown.tabZ !== null &&
      hudShown.zIndex < hudShown.tabZ,
    `hud z ${hudShown.zIndex} < tab z ${hudShown.tabZ} · overlapsTab ${hudShown.overlapsTab} · overlapsHeader ${hudShown.overlapsHeader} · inViewport ${hudShown.inViewport}`,
  );
  check(
    "the HUD is a card, not a player: no audio or video element inside it",
    hudShown.present && hudShown.audio === 0,
    `${hudShown.audio ?? "n/a"} media elements`,
  );
  await shot(hudPage, "hud-desktop");
  await hudPage.close();

  /* On a phone it must not exist: not in the DOM, not in the layout, not in the tab order — and the
     slot marker that reserves footer room must reserve nothing there. */
  const hudPhone = await browser.newPage();
  await hudPhone.setViewport({ width: 390, height: 844 });
  await hudPhone.goto(`${base}/`, { waitUntil: "load" });
  await sleep(900);
  await hudPhone.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5));
  await settleScroll(hudPhone);
  await sleep(400);
  const hudOnPhone = await hudPhone.evaluate(() => ({
    inDom: document.querySelectorAll("[data-release-hud]").length,
    hudTabStops: [...document.querySelectorAll("a[href], button")].filter((node) => node.closest("[data-release-hud]")).length,
    footerPadding: getComputedStyle(document.querySelector("footer")).paddingBottom,
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
  }));
  check(
    "the HUD does not exist at 390px, even after scrolling",
    hudOnPhone.inDom === 0 && hudOnPhone.hudTabStops === 0 && hudOnPhone.footerPadding === "0px" && hudOnPhone.overflowX <= 0,
    JSON.stringify(hudOnPhone),
  );
  await hudPhone.close();
  if (shotsDir) {
    await bookingPhone.screenshot({ path: join(shotsDir, "booking-phone.png") });
    await bookingPhone.click("[data-booking-copy]");
    await sleep(220);
    await bookingPhone.screenshot({ path: join(shotsDir, "booking-phone-copied.png") });
  }
  await bookingPhone.close();

  /*
   * Zero canvases at scroll 0, on EVERY viewport — and the band still works once the reader moves.
   *
   * History, because this check has been wrong before: round 20 baked the monogram into WebP stills
   * and the contract was absolute; round 29 added a lazy GPU quad and it held at 1440×900, which is
   * the only size this script used to probe. It did not hold on a phone, and the reason was not a
   * race — `page.module.css` collapses `.hero` to `height: auto` below 900px, so at 390×844 the
   * monogram band starts at y≈627 and 34.7 % of it is inside the first screen. Intersection fired
   * on load, correctly, and the canvas mounted before the reader had moved a pixel.
   *
   * Langkah 3h-1 replaced the shader with a Canvas 2D foil and closed the hole at its source: the
   * orchestrator now requires BOTH intersection and `scrollY > 1`. The probes below assert that at
   * 1440×900 and at 390×844, and then assert the opposite failure — that a gate which never opens
   * is not a fix — by scrolling to the band and requiring exactly one canvas, inside it.
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

  /*
   * The phone probe. `isMobile` matters: the ≤899px layout rule is what the violation depended on,
   * and a bare 390px-wide desktop window would not reproduce a real handset's viewport handling.
   */
  const phoneProbe = await browser.newPage();
  await phoneProbe.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await phoneProbe.goto(`${base}/`, { waitUntil: "load" });
  await sleep(1600);
  const phoneBefore = await phoneProbe.evaluate(() => {
    const band = document.querySelector('[class*="signature"]');
    const box = band?.getBoundingClientRect();
    return {
      count: document.querySelectorAll("canvas").length,
      onScreen: Boolean(box && box.top < window.innerHeight && box.bottom > 0),
      bandTop: box ? Math.round(box.top) : null,
      scrollY: Math.round(window.scrollY),
    };
  });
  check(
    "no canvas in the first fold on a phone either",
    phoneBefore.count === 0,
    `390×844 at scroll ${phoneBefore.scrollY}: ${phoneBefore.count} canvas · band top ${phoneBefore.bandTop}px (inside the first screen: ${phoneBefore.onScreen})`,
  );

  /*
   * …and the gate opens. A band that never mounts its surface is not a fixed band, it is a deleted
   * one. This also pins the ≥768px ambient contract as a *state* rather than as a stylesheet rule:
   * `data-ambient`, the computed opacity and the pointer-events are all read back from the DOM.
   */
  if (phoneBefore.count === 0) {
    await phoneProbe.evaluate(() => {
      document.querySelector('[class*="signature"]')?.scrollIntoView({ block: "center" });
    });
    await sleep(1800);
    const phoneAfter = await phoneProbe.evaluate(() => {
      const band = document.querySelector('[class*="signature"]');
      const host = document.querySelector("[data-foil-host]");
      const layer = host?.parentElement;
      const canvases = [...document.querySelectorAll("canvas")];
      const state = band?.querySelector("[data-foil-state]")?.getAttribute("data-foil-state");
      const css = layer ? getComputedStyle(layer) : null;
      return {
        canvases: canvases.length,
        inBand: canvases.every((node) => Boolean(band && band.contains(node))),
        state,
        ambient: host?.getAttribute("data-ambient"),
        opacity: css?.opacity ?? null,
        pointerEvents: css?.pointerEvents ?? null,
      };
    });
    check(
      "the phone mounts exactly one canvas once the band is reached, as the ambient variant",
      phoneAfter.canvases === 1 &&
        phoneAfter.inBand &&
        phoneAfter.state === "active" &&
        phoneAfter.ambient === "true" &&
        phoneAfter.opacity === "0.2" &&
        phoneAfter.pointerEvents === "none",
      `canvases: ${phoneAfter.canvases} (in band: ${phoneAfter.inBand}) · state: ${phoneAfter.state} · ambient: ${phoneAfter.ambient} · opacity: ${phoneAfter.opacity} · pointer-events: ${phoneAfter.pointerEvents}`,
    );
  } else {
    check("the phone mounts exactly one canvas once the band is reached, as the ambient variant", false, "no canvas probe ran: the scroll-0 gate already failed");
  }
  await phoneProbe.close();

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
  } else {
    check("the back of the sheet opens, covers the screen, locks the page and returns focus", false, "no [data-sheet-toggle]");
    check("Escape closes the back of the sheet and unlocks the page", false, "no [data-sheet-toggle]");
  }
  await pressProof.close();

  /* No tolerance list any more: Langkah 3h-1 removed the GPU stack, so there is no "the machine has
     no WebGL" class of expected message left to excuse. Any console error is a real error. */
  check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

  await page.close();
} finally {
  await browser.close();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length > 0 ? 1 : 0;
