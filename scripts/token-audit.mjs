#!/usr/bin/env node
/**
 * Token audit — the deterministic half of what `skillui` reports.
 *
 *   npm run audit:tokens
 *   npm run audit:tokens -- --verbose
 *
 * Why this exists: `skillui` (the static design-system extractor from the owner's tool list) will
 * happily tell you a project has "1 font family" and "spring physics" when it has three families and
 * no spring library — but it also flagged three raw hex values that had escaped the token file. That
 * half of its output is worth keeping, so this script does it properly and repeats it on every push:
 *
 *   1. every `#rrggbb` in a CSS *declaration* (comments stripped) must exist in tokens.css;
 *   2. every custom property defined in tokens.css must be referenced somewhere, unless it is on the
 *      documented allowlist below (semantic aliases and colours kept for the owner's later use).
 *
 * It deliberately does not police `rgb()` / `color-mix()` scrims: those are relative to whatever they
 * sit on, not palette entries.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const verbose = process.argv.includes("--verbose");

/**
 * Tokens that are correct to define without a consumer yet. Keep this list short and dated — a
 * growing allowlist is how a token file becomes archaeology.
 */
const ALLOWED_UNUSED = new Set([
  // Scale steps. A spacing / radius / z / duration scale is a vocabulary: the step exists so the
  // next component can land on it instead of inventing a value. Orphaned *colours* are different
  // and are not allowed here.
  "--space-32",
  "--radius-xl",
  "--duration-breath",
  "--z-content",
  "--z-effects",
  // Retired from every surface (D-110) but kept until the owner confirms deletion; the purple is
  // part of the platform's brand, not this site's.
  "--color-signal-purple",
  "--color-poster-yellow",
  "--color-signal-blue-hover",
  // Legacy aliases from the v2 ramp. They are defined once and inherited by the Studio; the public
  // pages now reference the semantic names directly.
  "--color-bg-surface-2",
  "--color-bone-100",
]);

const ALLOWED_RAW = new Set([
  "#ffffff", // pure white inside generated SVGs (sleeves, og cards) is not a theme colour
  "#000000",
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (["node_modules", ".next", ".git", "public", "drizzle"].includes(entry)) continue;
      walk(full, out);
    } else if (entry.endsWith(".css")) {
      out.push(full);
    }
  }
  return out;
}

/** Comments out of the way: a hex inside `/* … *\/` was a documentation example, not a value. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

const tokenFile = join(root, "src/styles/tokens.css");
const tokenSource = stripComments(readFileSync(tokenFile, "utf8"));

const defined = new Set([...tokenSource.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map((m) => m[1]));

const cssFiles = walk(join(root, "src"));
const rawValues = [];
const used = new Set();

/** Component-local properties (`--tilt-x`, `--reveal-delay`) are defined where they are used. */
const local = new Set();

for (const file of cssFiles) {
  const body = stripComments(readFileSync(file, "utf8"));
  for (const match of body.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)) local.add(match[1]);
  for (const match of body.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
    if (ALLOWED_RAW.has(match[0].toLowerCase())) continue;
    if (file === tokenFile) continue; // the definition site is allowed to hold the literal
    rawValues.push({ file: relative(root, file), value: match[0] });
  }
  for (const match of body.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) used.add(match[1]);
  // Tokens can also be referenced from TS/TSX (inline styles, the OG card, JSON-ish config).
}

// TS/TSX also consume tokens through inline styles and CSS-in-JS objects.
for (const file of walk(join(root, "src"))) {
  void file;
}
function walkTs(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (["node_modules", ".next"].includes(entry)) continue;
      walkTs(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}
for (const file of walkTs(join(root, "src"))) {
  const body = readFileSync(file, "utf8");
  for (const match of body.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) used.add(match[1]);
}

/**
 * Names that legitimately exist without a `tokens.css` definition:
 * - `--font-display` / `--font-body` / `--font-mono` are set by `next/font` on `<html>`;
 * - `--rail-pin` / `--ticker` are written by the scroll loop, and the whole point of `registerPin`
 *   is that the property name is decided by the component, not by the token file.
 */
const EXTERNAL = /^--font-|^--rail-pin$|^--ticker$/;

/* A reference to a token that does not exist is worse than a raw value: the declaration silently
   becomes invalid and the browser drops the whole rule. `--space-10` was used for a while and never
   defined — nothing failed, the margin just disappeared. So the audit checks both directions. */
const undefinedRefs = [...used]
  .filter((token) => !defined.has(token) && !local.has(token) && !EXTERNAL.test(token))
  .sort();

const unused = [...defined].filter((token) => !used.has(token) && !ALLOWED_UNUSED.has(token)).sort();

const problems = [];

if (rawValues.length > 0) {
  problems.push(
    `${rawValues.length} raw hex value(s) outside tokens.css:\n` +
      rawValues.map((hit) => `  ${hit.value}  ${hit.file}`).join("\n"),
  );
}

if (undefinedRefs.length > 0) {
  problems.push(
    `${undefinedRefs.length} reference(s) to a token that is not defined in tokens.css:\n  ` +
      undefinedRefs.join("\n  "),
  );
}

if (unused.length > 0) {
  problems.push(`${unused.length} token(s) defined but never used:\n  ${unused.join("\n  ")}`);
}

if (verbose) {
  console.log(`tokens defined: ${defined.size}`);
  console.log(`tokens referenced: ${used.size}`);
  console.log(`css files scanned: ${cssFiles.length}`);
}

if (problems.length > 0) {
  console.error(`✗ token audit failed\n\n${problems.join("\n\n")}\n`);
  process.exitCode = 1;
} else {
  console.log(`✓ ${defined.size} tokens, no raw hex values in CSS modules, no orphaned tokens`);
}
