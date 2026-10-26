#!/usr/bin/env node
/**
 * Frame-cost audit: what the page actually spends its frames on.
 *
 *   npm run perf:audit                       # four scenarios, ~20 s
 *   npm run perf:audit -- --ablation         # one suspect at a time: the round-11 matrix
 *   npm run perf:audit -- --label=after      # names the JSON run under /tmp/an-perf
 *   npm run perf:audit -- --base=http://127.0.0.1:3100
 *
 * The two modes answer different questions, and neither is optional if the numbers are to mean
 * anything:
 *
 *   - **scenarios** (default) answer "is the page holding 60 fps, and in which interaction does it
 *     not?" — idle, pointer over the hero, pointer with the WebGL band on screen, wheel scrolling;
 *   - **`--ablation`** answers "*why*" — it re-runs the pointer sweep with exactly one cost removed
 *     per row, using the `?perf=` switches in `src/components/zine/perf-flags.ts`. Six changes
 *     shipped in one commit, so a single before/after pair cannot attribute any of them; the matrix
 *     can.
 *
 * Why this exists as a separate script when `qa:motion` already drives a browser: `qa:motion` runs
 * with `--disable-gpu --use-gl=swiftshader`, because it is asserting *behaviour* and wants the same
 * rendering path on every machine. Its frame timings are therefore software-raster timings and mean
 * nothing about a reader's laptop. This script does the opposite: it uses the real GPU path, keeps
 * the page in one state per scenario, and reports where the time went.
 *
 * What it reports, per scenario:
 *
 *   - `medianFrameMs` / `p95FrameMs`: how often a frame was actually produced. The median is the
 *     steady state; p95 is what a reader feels as stutter;
 *   - `over20ms`: frames that missed a 60 Hz deadline (16.7 ms) badly enough to be visible;
 *   - `longFrames` + `loaf*`: long-animation-frame entries, split by the browser itself into
 *     `styleLayout` (style recalc + layout) and `script`. This is the distinction that matters:
 *     a pointer effect that forces layout shows up in `styleLayout`, a heavy component loop shows
 *     up in `script`;
 *   - `recalcStyleCount` / `layoutCount`: absolute counts from CDP. A frame budget problem caused by
 *     style invalidation is visible here even when the average frame looks fine.
 *
 * The counter-intuitive one to read first is `layoutCount`: a page whose pointer interaction forces
 * a layout *per event* shows a layout count in the hundreds for a four-second gesture. The target is
 * near zero — nothing in this design needs layout while the cursor moves.
 *
 * Caveats worth stating out loud, because a benchmark that hides them is a lie:
 *   - a headless server usually has no GPU, so absolute numbers are software raster. Compare runs,
 *     do not compare them to a laptop. On a software rasteriser the *ratio* between rows is still
 *     meaningful — fragment-heavy work is exactly what software raster punishes — but the absolute
 *     fps is not;
 *   - the machine running this is also running the Next.js server;
 *   - `--ablation` scrolls nothing and leaves the page at the top, so the WebGL band is not on
 *     screen during it: the `-canvas` row measures the cost of the canvas *not existing*, which on
 *     that page is ~zero by design. Use the default mode with `pointer-monogram` for the scene.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import puppeteer from "puppeteer-core";

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const base = argValue("--base", process.env.AUDIT_BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const label = argValue("--label", "run");
const outDir = argValue("--out", join("/tmp", "an-perf"));
mkdirSync(outDir, { recursive: true });

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

const VIEWPORT = { width: 1440, height: 900 };

/**
 * Recorder. Everything lives on `window.__perf` and is read back once per scenario, so the page is
 * never touched while it is being measured.
 */
const RECORD = () => {
  window.__perf = { frames: [], loaf: [] };
  let last = performance.now();
  const loop = (now) => {
    window.__perf.frames.push(now - last);
    last = now;
    window.__perf.raf = requestAnimationFrame(loop);
  };
  window.__perf.raf = requestAnimationFrame(loop);
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__perf.loaf.push({
        duration: entry.duration,
        script: (entry.scripts ?? []).reduce((sum, s) => sum + (s.duration ?? 0), 0),
        styleLayout: entry.styleAndLayoutStart
          ? entry.startTime + entry.duration - entry.styleAndLayoutStart
          : 0,
      });
    }
  }).observe({ type: "long-animation-frame", buffered: true });
};

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  /*
   * Deliberately *not* `--disable-gpu`: this script is about the compositor. `qa:motion` keeps the
   * software path because it asserts behaviour; here the whole point is the real one.
   */
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});

const cdp = await browser.target().createCDPSession();
await cdp.send("Performance.enable");

async function counters() {
  const { metrics } = await cdp.send("Performance.getMetrics");
  return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
}

async function openPage(query = "") {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => sessionStorage.setItem("an-curtain", "1"));
  await page.setViewport({ ...VIEWPORT, deviceScaleFactor: 1 });
  await page.goto(`${base}/${query}`, { waitUntil: "load", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1400));
  return page;
}

/** Sweep the pointer across the hero at roughly pointer-event rate for `ms`. */
async function sweep(page, ms) {
  const start = Date.now();
  let i = 0;
  while (Date.now() - start < ms) {
    const t = i / 40;
    const x = VIEWPORT.width / 2 + Math.sin(t) * (VIEWPORT.width / 2 - 40);
    const y = 480 + Math.cos(t * 1.3) * 280;
    await page.mouse.move(x, y);
    i += 1;
    await new Promise((r) => setTimeout(r, 16));
  }
}

async function scenario(page, name, drive) {
  await page.evaluate(RECORD);
  const before = await counters();
  await drive();
  const after = await counters();
  const raw = await page.evaluate(() => {
    cancelAnimationFrame(window.__perf.raf);
    return window.__perf;
  });

  const frames = raw.frames.slice(1).sort((a, b) => a - b);
  const at = (q) => frames[Math.min(frames.length - 1, Math.floor(frames.length * q))] ?? 0;
  const sum = (key) => raw.loaf.reduce((total, entry) => total + entry[key], 0);
  const ms = (key) => +((after[key] - before[key]) * 1000).toFixed(1);

  return {
    scenario: name,
    fps: +(1000 / (frames.reduce((a, b) => a + b, 0) / frames.length || 1)).toFixed(1),
    medianFrameMs: +at(0.5).toFixed(1),
    p95FrameMs: +at(0.95).toFixed(1),
    worstFrameMs: +(frames.at(-1) ?? 0).toFixed(1),
    over20ms: frames.filter((f) => f > 20).length,
    longFrames: raw.loaf.length,
    loafStyleLayoutMs: +sum("styleLayout").toFixed(1),
    loafScriptMs: +sum("script").toFixed(1),
    recalcStyle: Math.round(after.RecalcStyleCount - before.RecalcStyleCount),
    recalcStyleMs: ms("RecalcStyleDuration"),
    layouts: Math.round(after.LayoutCount - before.LayoutCount),
    layoutMs: ms("LayoutDuration"),
    taskMs: ms("TaskDuration"),
  };
}

/**
 * Ablation profiles.
 *
 * `--ablation` runs the pointer sweep once per suspect and prints the matrix, which is the only way
 * to read round 11 honestly: the round changed six things at once, so a single "before/after" number
 * cannot attribute anything. Each row removes exactly one cost from the shipped build (or, for
 * `blur`, adds one back), so the difference against `baseline` is that cost and nothing else.
 *
 * `?perf=` is documented in `src/components/zine/perf-flags.ts`.
 */
const ABLATION = [
  { name: "baseline", query: "", note: "the shipped build" },
  { name: "-plate", query: "?perf=noplate", note: "hero does not rotate towards the pointer" },
  { name: "-ink", query: "?perf=noink", note: "ink plate frozen (no text-shadow writes)" },
  /* Round 20 retired the `-canvas` row with its subject: the monogram is a baked WebP still, so the
     ablation matrix no longer needs a row to prove what the renderer cost — the permanent answer
     is in docs/08-IMPLEMENTATION/design-review/round20/. */
  { name: "+blur", query: "?perf=blur", note: "header backdrop-filter restored" },
  { name: "-plate-ink-blur", query: "?perf=noplate,noink,blur", note: "every remaining switch at once" },
];

const ablation = args.includes("--ablation");
const rows = [];
try {
  if (ablation) {
    for (const profile of ABLATION) {
      const page = await openPage(profile.query);
      const row = await scenario(page, profile.name, () => sweep(page, 4000));
      rows.push({ ...row, note: profile.note, query: profile.query || "—" });
      await page.close();
    }
  } else {
    /* At rest at the top: the hero is on screen, nothing is animating. A high number here means the
       page is paying for something it is not doing. */
    {
      const page = await openPage();
      rows.push(await scenario(page, "idle-hero", () => new Promise((r) => setTimeout(r, 3000))));
      await page.close();
    }

    /* The gesture the owner described as heavy: pointer moving over the hero. This exercises the
       plate rotation, the ink plate, the header over the moving hero, and nothing else. */
    {
      const page = await openPage();
      rows.push(await scenario(page, "pointer-hero", () => sweep(page, 4000)));
      await page.close();
    }

    /* Same gesture with the monogram band on screen, which adds the WebGL scene. */
    {
      const page = await openPage();
      await page.evaluate(() => {
        const band = document.querySelectorAll("section")[1];
        band?.scrollIntoView({ block: "center" });
      });
      await new Promise((r) => setTimeout(r, 2500));
      rows.push(await scenario(page, "pointer-monogram", () => sweep(page, 4000)));
      await page.close();
    }

    /* Wheel scrolling: Lenis, the depth engine, the sticky header and the wall. */
    {
      const page = await openPage();
      rows.push(
        await scenario(page, "wheel-scroll", async () => {
          const start = Date.now();
          let flip = 1;
          while (Date.now() - start < 4000) {
            await page.mouse.wheel({ deltaY: flip * 140 });
            flip = -flip;
            await new Promise((r) => setTimeout(r, 40));
          }
        }),
      );
      await page.close();
    }
  }
} finally {
  console.log(`\nperf:audit — ${label} — ${base}`);
  if (ablation) {
    /* The delta table is the point of the mode: absolute frame times on a headless GPU-less server
       are noise, but "removing X bought Y ms" is a comparison inside one machine and one run. */
    const baseline = rows.find((r) => r.scenario === "baseline");
    const delta = rows.map((row) => ({
      profile: row.scenario,
      query: row.query,
      fps: row.fps,
      "Δfps": baseline ? +(row.fps - baseline.fps).toFixed(1) : 0,
      p95: row.p95FrameMs,
      "Δp95": baseline ? +(row.p95FrameMs - baseline.p95FrameMs).toFixed(1) : 0,
      "over20ms": row.over20ms,
      styleLayout: row.loafStyleLayoutMs,
      script: row.loafScriptMs,
      layouts: row.layouts,
      note: row.note,
    }));
    console.table(delta);
    console.log(
      "read it as: a large positive Δfps (or negative Δp95) on a row means that cost was the expensive one.\n" +
        "`-plate` and `-canvas` are the two that change what the page *is*; `-ink` and `+blur` are pure cost.",
    );
  } else {
    console.table(rows);
  }
  const file = join(outDir, `${label}${ablation ? "-ablation" : ""}.json`);
  writeFileSync(file, JSON.stringify({ label, base, viewport: VIEWPORT, rows }, null, 1));
  console.log(`written ${file}`);
  console.log(
    "read it as: layouts ≈ 0 during pointer movement (no layout thrash), " +
      "loafStyleLayoutMs split from loafScriptMs (style vs component cost), " +
      "p95FrameMs ≈ 16.7 for a held 60 fps.",
  );
  await browser.close();
}
