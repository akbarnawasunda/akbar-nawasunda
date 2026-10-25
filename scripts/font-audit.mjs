#!/usr/bin/env node
/**
 * Font audit — the two-face contract, enforced (round 19).
 *
 *   npm run audit:fonts
 *
 * The owner's rule after seeing five families fight in one viewport ("ransom note effect"):
 *
 *   --font-display  Excess V Straight  H1 / the giant hero name ONLY — plus the two other places
 *                                      where that same name IS the graphic: the footer wordmark
 *                                      and the loading curtain.
 *   --font-body     Relidux            everything else: H2/H3, release and track titles,
 *                                      paragraphs, buttons, navigation, meta labels.
 *
 * Psychlone Straight, Impact Label SWL and Marseloup are purchased and stay in src/assets/fonts,
 * but nothing may load or reference them. This script checks both halves:
 *
 *   1. the two live slots point at real WOFF2 binaries that exist;
 *   2. no stylesheet or component reaches for a retired family, a retired stack token, or a
 *      third/fourth `localFont` loader.
 *
 * Exit 1 on any violation — this is a pass/fail contract now, not a report.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const fontsDir = join(root, "src", "assets", "fonts");
const fontsTs = readFileSync(join(root, "src", "lib", "fonts.ts"), "utf8");

const LIVE = [
  { variable: "--font-display", file: "Excess V Straight.woff2", role: "H1 / hero name, footer wordmark, loading curtain" },
  { variable: "--font-body", file: "Relidux.woff2", role: "everything else" },
];

const RETIRED_FAMILIES = ["Psychlone", "Impact Label", "Marseloup", "Marse-loup", "Marse Loup"];
const RETIRED_TOKENS = ["--font-heading", "--font-label", "--font-accent"];

const problems = [];

console.log("\nlive slots");
for (const slot of LIVE) {
  const path = join(fontsDir, slot.file);
  const ok = existsSync(path) && readFileSync(path).subarray(0, 4).toString("latin1") === "wOF2";
  const wired = fontsTs.includes(`variable: "${slot.variable}"`) && fontsTs.includes(`../assets/fonts/${slot.file}`);
  if (!ok) problems.push(`${slot.file}: missing or not WOFF2`);
  if (!wired) problems.push(`${slot.variable}: not wired in src/lib/fonts.ts`);
  console.log(`  ${slot.variable.padEnd(14)} ${slot.file.padEnd(26)} ${ok && wired ? "ok" : "BROKEN"}   ${slot.role}`);
}

const loaders = (fontsTs.match(/localFont\(/g) || []).length;
if (loaders !== LIVE.length) problems.push(`src/lib/fonts.ts declares ${loaders} loaders, expected ${LIVE.length}`);

console.log("\nretired faces — must appear nowhere in src/");
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const sources = walk(join(root, "src")).filter((p) => /\.(css|tsx?|ts)$/.test(p) && !p.includes("fonts.ts"));
for (const p of sources) {
  const text = readFileSync(p, "utf8");
  for (const fam of RETIRED_FAMILIES) {
    if (text.includes(fam)) problems.push(`${relative(root, p)}: references retired family "${fam}"`);
  }
  for (const tok of RETIRED_TOKENS) {
    if (text.includes(tok)) problems.push(`${relative(root, p)}: references retired token "${tok}"`);
  }
}
console.log(problems.length === 0 ? "  clean — no stylesheet or component reaches for them" : "  violations above");

if (problems.length > 0) {
  console.log("\nproblems:");
  for (const p of problems) console.log(`  - ${p}`);
  console.log("");
  process.exit(1);
}
console.log("\n2 families, 1 voice for the identity, 1 voice for reading.\n");
