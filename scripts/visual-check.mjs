#!/usr/bin/env node
/**
 * Permanent visual verification harness.
 *
 *   npm run visual:check -- /                       # one page
 *   npm run visual:check -- / /music /music/slug   # several pages
 *   npm run visual:check                           # defaults: / , /music , first release
 *   npm run visual:check -- --open                 # defaults + best-effort open the folder
 *
 * For every route it takes a FULL-PAGE PNG at 1440x900 and 390x844 into
 * artifacts/visual-check/, runs an axe-core scan, and reports every console
 * error/warning, pageerror, failed request and HTTP >= 400 response.
 *
 * Browser resolution:
 *   1. $CHROME_PATH                         (any system Chrome on a normal machine)
 *   2. .visual-tools/chrome                 (created by scripts/setup-visual-tools.sh)
 *   If neither exists, it tells you to run `npm run visual:setup`.
 *
 * Sandbox notes (see docs/VISUAL-VERIFICATION.md):
 *   - LD_LIBRARY_PATH and FONTCONFIG_PATH are passed to Chromium by this script,
 *     so no shell exports are needed. The fontconfig is rewritten at startup
 *     because it contains an absolute path that changes when the repo moves.
 *   - Chromium 153 in this image crashes on `text-wrap: balance` in some builds.
 *     The harness first tries the page untouched. Only if the renderer crashes
 *     does it retry with that one declaration rewritten to `text-wrap: wrap`,
 *     and it prints a loud WORKAROUND line when it does. Nothing in src/ changes.
 */
import { chromium } from "playwright-core";
import { AxeBuilder } from "@axe-core/playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const TOOLS = process.env.VISUAL_TOOLS_DIR || join(ROOT, ".visual-tools");
const OUT = join(ROOT, "artifacts", "visual-check");

const VIEWPORTS = [
  { id: "1440x900", width: 1440, height: 900, label: "desktop" },
  { id: "390x844", width: 390, height: 844, label: "mobile" },
];

// ------------------------------------------------------------------ CLI parsing
const rawArgs = process.argv.slice(2);
const opts = {
  base: process.env.DEV_URL || "http://localhost:3000",
  open: false,
  patchBalance: false,
  noFail: false,
  help: false,
};
const paths = [];

for (let i = 0; i < rawArgs.length; i += 1) {
  const a = rawArgs[i];
  if (a === "--open") opts.open = true;
  else if (a === "--patch-balance") opts.patchBalance = true;
  else if (a === "--no-fail") opts.noFail = true;
  else if (a === "--help" || a === "-h") opts.help = true;
  else if (a === "--base") { opts.base = rawArgs[++i] || opts.base; }
  else if (a.startsWith("--base=")) { opts.base = a.slice(7); }
  else if (a.startsWith("/")) paths.push(a);
  else if (!a.startsWith("-")) paths.push(a.startsWith("/") ? a : `/${a}`);
  else { console.error(`Unknown option: ${a}`); process.exit(2); }
}

if (opts.help) {
  console.log(`Usage: npm run visual:check -- [options] [path ...]

Options:
  --open             use the default route set and best-effort open the output folder
  --base <url>       base URL (default http://localhost:3000, or $DEV_URL)
  --patch-balance    force the text-wrap:balance workaround from the first attempt
  --no-fail          always exit 0, even with axe violations or console errors
  --help             show this text

No paths (or --open) scans: / , /music , and the first release in the catalogue.
Output: artifacts/visual-check/<page>-<width>x<height>.png`);
  process.exit(0);
}

// ------------------------------------------------------------- route defaults
async function firstReleasePath(base) {
  try {
    const res = await fetch(new URL("/sitemap.xml", base).toString(), { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const xml = await res.text();
      const match = xml.match(/\/music\/([a-z0-9-]+)/i);
      if (match) return `/music/${match[1]}`;
    }
  } catch { /* server may be down; fall through */ }
  try {
    const source = readFileSync(join(ROOT, "src", "content", "releases.ts"), "utf8");
    const match = source.match(/slug:\s*["']([^"']+)["']/);
    if (match) return `/music/${match[1]}`;
  } catch { /* fall through */ }
  return "/music/masih-mencintainya-papinka";
}

const routes = paths.length && !opts.open
  ? paths
  : ["/", "/music", await firstReleasePath(opts.base)];

// ------------------------------------------------------------- browser setup
function prepareEnvironment() {
  if (!existsSync(join(TOOLS, "fonts.conf")) && !process.env.CHROME_PATH) return null;
  if (existsSync(TOOLS)) {
    mkdirSync(join(TOOLS, "fonts"), { recursive: true });
    // Absolute paths must match the current checkout location.
    writeFileSync(
      join(TOOLS, "fonts.conf"),
      `<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n  <dir>${join(TOOLS, "fonts")}</dir>\n  <dir>/usr/share/fonts</dir>\n  <cachedir>/tmp/visual-tools-font-cache</cachedir>\n  <config></config>\n</fontconfig>\n`,
    );
  }
  const env = { ...process.env };
  if (existsSync(join(TOOLS, "libs"))) {
    env.LD_LIBRARY_PATH = [
      join(TOOLS, "libs", "lib"),
      join(TOOLS, "libs"),
      env.LD_LIBRARY_PATH,
    ].filter(Boolean).join(":");
    env.FONTCONFIG_PATH = TOOLS;
  }
  return env;
}

const chromePath = process.env.CHROME_PATH || join(TOOLS, "chrome");
if (!process.env.CHROME_PATH && !existsSync(chromePath)) {
  console.error("✗ No browser found. Restore the toolkit with:\n    npm run visual:setup\n(or set CHROME_PATH to a system Chrome)");
  process.exit(1);
}

let serverOk = true;
try {
  const res = await fetch(new URL("/", opts.base).toString(), { signal: AbortSignal.timeout(6000) });
  serverOk = res.ok;
} catch { serverOk = false; }
if (!serverOk) {
  console.error(`✗ No server at ${opts.base}. Start it first:\n    npm run dev`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const launchEnv = prepareEnvironment();

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  env: launchEnv || undefined,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});

function pageSlug(path) {
  const clean = path.split("?")[0].replace(/^\/+|\/+$/g, "");
  return (clean || "home").replace(/[^a-zA-Z0-9-_]/g, "-");
}

// ----------------------------------------------------------------- one capture
async function capture(context, route, vp, patchBalance) {
  const page = await context.newPage();
  const messages = [];   // { type, text }
  const pageErrors = [];
  const requestFailed = [];
  const httpErrors = [];

  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") {
      messages.push({ type: m.type(), text: m.text() });
    }
  });
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("requestfailed", (r) => requestFailed.push(`${r.url()} — ${r.failure()?.errorText}`));
  page.on("response", (r) => { if (r.status() >= 400) httpErrors.push(`${r.status()} ${r.url()}`); });

  if (patchBalance) {
    await page.route("**/*", async (r) => {
      if (r.request().resourceType() !== "stylesheet") return r.continue();
      const resp = await r.fetch();
      const body = await resp.text();
      if (body.includes("text-wrap:balance")) {
        await r.fulfill({ response: resp, body: body.replaceAll("text-wrap:balance", "text-wrap:wrap") });
        return;
      }
      await r.fulfill({ response: resp, body });
    });
  }

  const url = new URL(route, opts.base).toString();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(1600); // entry curtain (1s) + hydration

  // Scroll once so lazy images resolve and scroll-reveal observers settle before
  // the full-page capture. Without this, below-the-fold sections look blank.
  await page.evaluate(async () => {
    const step = Math.max(280, Math.floor(window.innerHeight * 0.6));
    const H = () => document.documentElement.scrollHeight;
    for (let y = 0; y < H(); y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo(0, H());
    await new Promise((r) => setTimeout(r, 180));
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = "eager"; });
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 220));
  });
  await page.waitForTimeout(400);

  const file = `${pageSlug(route)}-${vp.id}.png`;
  const full = join(OUT, file);
  await page.screenshot({ path: full, fullPage: true, timeout: 90000 });
  const bytes = statSync(full).size;

  const axe = await new AxeBuilder({ page }).analyze();
  const violations = axe.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.length,
    targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
  }));

  const dom = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc).length,
  }));

  await page.close();
  return { route, vp, url, file, full, bytes, violations, messages, pageErrors, requestFailed, httpErrors, dom, patchBalance };
}

function printCapture(r) {
  console.log(`\n──────── ${r.route}  @  ${r.vp.id} (${r.vp.label}) ────────`);
  console.log(`URL        : ${r.url}`);
  console.log(`Screenshot : ${r.full}`);
  console.log(`Size       : ${r.bytes} bytes  (${r.dom.width}x${r.dom.height}px page, ${r.dom.brokenImages} broken images)`);
  if (r.patchBalance) console.log("WORKAROUND : text-wrap:balance -> wrap (Chromium 153 renderer crash)");
  console.log(`axe-core   : ${r.violations.length} violation(s)`);
  for (const v of r.violations) {
    console.log(`   - ${v.id} [${v.impact}] ${v.nodes} node(s): ${v.description}`);
    for (const t of v.targets) console.log(`       → ${t}`);
  }
  const errors = r.messages.filter((m) => m.type === "error");
  const warnings = r.messages.filter((m) => m.type === "warning");
  console.log(`console.error (${errors.length}), console.warning (${warnings.length}), pageerror (${r.pageErrors.length}), requestfailed (${r.requestFailed.length}), HTTP>=400 (${r.httpErrors.length})`);
  for (const e of errors) console.log(`   ✗ error   : ${e.text}`);
  for (const w of warnings) console.log(`   ! warning : ${w.text}`);
  for (const e of r.pageErrors) console.log(`   ✗ pageerror: ${e}`);
  for (const e of r.requestFailed) console.log(`   ✗ requestfailed: ${e}`);
  for (const e of r.httpErrors) console.log(`   ✗ http: ${e}`);
}

// ---------------------------------------------------------------------- main
console.log("Visual verification");
console.log(`  base     : ${opts.base}`);
console.log(`  browser  : ${chromePath}`);
console.log(`  routes   : ${routes.join(", ")}`);
console.log(`  viewports: ${VIEWPORTS.map((v) => v.id).join(", ")}`);
console.log(`  output   : ${OUT}`);

const results = [];
for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    locale: "id-ID",
  });

  for (const route of routes) {
    let result;
    try {
      result = await capture(context, route, vp, opts.patchBalance);
    } catch (err) {
      const crashed = /crash|Target closed|Page crashed/i.test(String(err));
      if (!crashed || opts.patchBalance) {
        console.error(`\n✗ FAILED ${route} @ ${vp.id}: ${String(err).split("\n")[0]}`);
        process.exitCode = 1;
        continue;
      }
      console.warn(`\n! ${route} @ ${vp.id} crashed (${String(err).split("\n")[0]}).`);
      console.warn("! Retrying with the text-wrap:balance workaround. Reporting this explicitly.");
      try {
        result = await capture(context, route, vp, true);
      } catch (err2) {
        console.error(`\n✗ FAILED (retry) ${route} @ ${vp.id}: ${String(err2).split("\n")[0]}`);
        process.exitCode = 1;
        continue;
      }
    }
    results.push(result);
    printCapture(result);
  }
  await context.close();
}
await browser.close();

// ------------------------------------------------------------------- summary
const totalViolations = results.reduce((a, r) => a + r.violations.length, 0);
const totalErrors = results.reduce(
  (a, r) => a + r.messages.filter((m) => m.type === "error").length + r.pageErrors.length + r.requestFailed.length + r.httpErrors.length,
  0,
);
const totalWarnings = results.reduce((a, r) => a + r.messages.filter((m) => m.type === "warning").length, 0);
const usedWorkaround = results.some((r) => r.patchBalance);

console.log("\n════════════════════════════ SUMMARY ════════════════════════════");
console.log(`screenshots      : ${results.length} (expected ${routes.length * VIEWPORTS.length})`);
for (const r of results) console.log(`  ${r.full}  (${r.bytes} bytes)`);
console.log(`axe violations   : ${totalViolations}`);
console.log(`console errors   : ${totalErrors}`);
console.log(`console warnings : ${totalWarnings}`);
console.log(`crash workaround : ${usedWorkaround ? "USED (text-wrap:balance -> wrap)" : "not needed"}`);
console.log(`output folder    : ${OUT}`);

if (opts.open) {
  // Best-effort only: a headless sandbox usually has no desktop opener.
  const { spawn } = await import("node:child_process");
  const opener = process.platform === "darwin" ? "open" : "xdg-open";
  const child = spawn(opener, [OUT], { stdio: "ignore", detached: true });
  child.on("error", () => console.log(`(no GUI opener '${opener}' here — open the folder yourself)`));
  child.unref();
}

if (!opts.noFail && (totalViolations > 0 || totalErrors > 0 || process.exitCode === 1 || results.length !== routes.length * VIEWPORTS.length)) {
  process.exit(1);
}
