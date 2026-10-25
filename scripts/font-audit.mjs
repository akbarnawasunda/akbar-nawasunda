#!/usr/bin/env node
/**
 * Font audit — which family is actually serving each of the five type roles.
 *
 *   npm run audit:fonts
 *
 * Why this exists: the round 17 role map (`display / heading / body / label / accent`) is wired to
 * stand-in binaries until the owner's five licensed files land in `src/assets/fonts`. That is
 * invisible on a screenshot when one stand-in happens to look like the face it replaces, and the
 * round 17 report had to say "nothing changed" to the owner without being able to prove which of the
 * five slots had actually moved. This script answers that in one command:
 *
 *   1. reads the ROLE MAP out of `src/lib/fonts.ts` (the target family and the file in use);
 *   2. checks the file exists in `src/assets/fonts/` and is a real WOFF2 (magic bytes `wOF2`);
 *   3. reports how many roles are on their target family and how many are on a stand-in.
 *
 * Exit code is 0 either way: a stand-in is a legitimate, working state. The point is the printed
 * table, not a pass/fail.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const fontsDir = join(root, "src", "assets", "fonts");
const fontsTs = readFileSync(join(root, "src", "lib", "fonts.ts"), "utf8");

/**
 * The map below is the contract, not a copy of the file. `target` is what the owner asked for;
 * `slot` is the CSS role. If fonts.ts ever points somewhere unexpected, the mismatch is printed.
 */
const ROLES = [
  {
    slot: "display",
    variable: "--font-display",
    target: "Excess-V-Straight",
    use: "h1 — the site's own name, hero, footer wordmark, 404",
  },
  {
    slot: "heading",
    variable: "--font-heading",
    target: "Psychlone-Straight",
    use: "h2/h3 — section titles, page names, stat values",
  },
  {
    slot: "body",
    variable: "--font-body",
    target: "Relidux",
    use: "body copy, nav, buttons, every meta label",
  },
  {
    slot: "label",
    variable: "--font-label",
    target: "Impact-Label-SWL",
    use: "release and track titles, play links, stamp surfaces",
  },
  {
    slot: "accent",
    variable: "--font-accent",
    target: "Marseloup",
    use: "quotes and decorative lines",
  },
];

/** Pull the `src:` value(s) for one export block out of fonts.ts. */
function srcFor(variable) {
  const at = fontsTs.indexOf(`variable: "${variable}"`);
  if (at === -1) return { error: "variable not found in fonts.ts" };
  const start = fontsTs.lastIndexOf("localFont({", at);
  const block = fontsTs.slice(start, fontsTs.indexOf("});", at));
  const files = [...block.matchAll(/"\.\.\/assets\/fonts\/([^"]+)"/g)].map((m) => m[1]);
  const weights = [...block.matchAll(/weight:\s*"([^"]+)"/g)].map((m) => m[1]);
  return { files, weight: weights[0] ?? "—" };
}

function woff2(file) {
  const path = join(fontsDir, file);
  if (!existsSync(path)) return { ok: false, why: "missing" };
  const head = readFileSync(path).subarray(0, 4).toString("latin1");
  return head === "wOF2" ? { ok: true, bytes: readFileSync(path).length } : { ok: false, why: `not WOFF2 (${head})` };
}

const pad = (s, n) => String(s).padEnd(n);
console.log("\nrole      variable          target family        in use                                  weight   status");
console.log("--------  ----------------  -------------------  --------------------------------------  -------  ------");

let onTarget = 0;
const problems = [];

for (const role of ROLES) {
  const { files, weight, error } = srcFor(role.variable);
  if (error) {
    problems.push(`${role.slot}: ${error}`);
    continue;
  }
  const checks = files.map(woff2);
  const bad = checks.find((c) => !c.ok);
  const inUse = files.map((f) => f.replace(/\.woff2$/, "")).join(" + ");
  const isTarget =
    inUse.toLowerCase().includes(role.target.toLowerCase().replace(/[^a-z]/g, "").slice(0, 5)) ||
    files.some((f) => f.toLowerCase().startsWith(role.target.toLowerCase().split("-")[0].toLowerCase()));
  if (isTarget) onTarget += 1;
  if (bad) problems.push(`${role.slot}: ${bad.why} — ${files.join(", ")}`);

  console.log(
    `${pad(role.slot, 8)}  ${pad(role.variable, 16)}  ${pad(role.target, 19)}  ${pad(inUse.slice(0, 38), 38)}  ${pad(weight, 7)}  ${
      bad ? "BROKEN" : isTarget ? "target" : "stand-in"
    }`,
  );
}

console.log(`\n${onTarget}/5 role(s) on the target family.`);
for (const role of ROLES) console.log(`  ${pad(role.slot, 8)} ${role.use}`);

if (problems.length > 0) {
  console.log("\nproblems:");
  for (const p of problems) console.log(`  - ${p}`);
  process.exitCode = 1;
} else if (onTarget < ROLES.length) {
  console.log(
    "\nThe map is wired and rendering; the missing piece is the licensed binaries. Drop them into\n" +
      "src/assets/fonts/ and point the five `src:` values in src/lib/fonts.ts at them — no component\n" +
      "names a family, so nothing else changes.",
  );
}
console.log("");
