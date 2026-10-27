#!/usr/bin/env node
/**
 * Visual verification script for Akbar Nawasunda site.
 *
 * Usage:
 *   npm run visual:check -- /                    # Home page
 *   npm run visual:check -- /music               # Music index
 *   npm run visual:check -- /music/slug          # Release page
 *
 * Outputs:
 *   - Screenshots at 390x844 (mobile) and 1440x900 (desktop)
 *   - axe-core accessibility violations
 *   - Console errors
 *   - Failed network requests (4xx/5xx)
 */

import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

const ARTIFACTS_DIR = join(process.cwd(), "artifacts", "visual-check");

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

async function runVisualCheck(targetPath) {
  const baseUrl = process.env.DEV_URL || "http://localhost:3000";
  const fullUrl = new URL(targetPath, baseUrl).toString();

  console.log(`\n🔍 Visual check: ${fullUrl}`);
  console.log("=".repeat(60));

  ensureDir(ARTIFACTS_DIR);

  const browser = await chromium.launch({
    headless: true,
    // Safe in CI containers and in the Arena sandbox (no /dev/shm, no GPU, software WebGL).
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--use-gl=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const context = await browser.newContext();

  const errors = [];
  const failedRequests = [];
  const axeViolations = [];

  for (const viewport of VIEWPORTS) {
    const page = await context.newPage();
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(`[${viewport.name}] ${msg.text()}`);
      }
    });

    // Capture failed network requests
    page.on("response", (response) => {
      if (response.status() >= 400) {
        failedRequests.push(
          `[${viewport.name}] ${response.status()} ${response.url()}`
        );
      }
    });

    try {
      console.log(`\n📸 Loading ${viewport.name} (${viewport.width}x${viewport.height})...`);
      // `networkidle` never settles on a page with a continuous 3D render loop, so wait for the
      // document and then give fonts/animations a fixed beat instead.
      await page.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

      // Wait for any animations to settle
      await page.waitForTimeout(1500);

      // Take screenshot
      const screenshotName = `${targetPath.replace(/\//g, "-").slice(1) || "home"}-${viewport.name}-${timestamp()}.png`;
      const screenshotPath = join(ARTIFACTS_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   ✓ Screenshot saved: ${screenshotPath}`);

      // Run axe-core accessibility scan
      console.log(`   ♿ Running axe-core scan...`);
      const axeResults = await new AxeBuilder({ page }).analyze();

      if (axeResults.violations.length > 0) {
        console.log(`   ⚠️  ${axeResults.violations.length} accessibility violation(s) found:`);
        for (const violation of axeResults.violations) {
          axeViolations.push(`[${viewport.name}] ${violation.id}`);
          console.log(`      - ${violation.id}: ${violation.description}`);
          console.log(`        Impact: ${violation.impact}`);
          console.log(`        Nodes: ${violation.nodes.length}`);
          for (const node of violation.nodes.slice(0, 3)) {
            console.log(`          → ${node.target.join(" ")}`);
          }
        }
      } else {
        console.log(`   ✓ No accessibility violations`);
      }
    } catch (err) {
      console.error(`   ✗ Error on ${viewport.name}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  if (errors.length > 0) {
    console.log(`\n❌ Console Errors (${errors.length}):`);
    errors.forEach((e) => console.log(`   ${e}`));
  } else {
    console.log("\n✅ No console errors");
  }

  if (failedRequests.length > 0) {
    console.log(`\n❌ Failed Network Requests (${failedRequests.length}):`);
    failedRequests.forEach((r) => console.log(`   ${r}`));
  } else {
    console.log("\n✅ No failed network requests");
  }

  if (axeViolations.length > 0) {
    console.log(`\n❌ axe-core violations (${axeViolations.length}):`);
    axeViolations.forEach((v) => console.log(`   ${v}`));
  } else {
    console.log("\n✅ axe-core: 0 violations");
  }

  console.log(`\n📁 Artifacts saved to: ${ARTIFACTS_DIR}`);

  // Exit with error code if there are issues
  const hasIssues = errors.length > 0 || failedRequests.length > 0 || axeViolations.length > 0;
  process.exit(hasIssues ? 1 : 0);
}

// Get path from command line args
const targetPath = process.argv[2] || "/";
runVisualCheck(targetPath).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});