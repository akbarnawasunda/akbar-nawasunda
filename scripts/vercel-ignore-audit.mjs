#!/usr/bin/env node
/**
 * Vercel upload audit.
 *
 * `.vercelignore` removes files from the tree Vercel uploads before it runs
 * `npm ci && npm run build`. That is fine for docs and test fixtures, but fatal
 * for anything the build actually imports: `src/assets/manifest.ts` statically
 * imports the original artwork from `AKBAR-NAWASUNDA-ASSETS/`, so excluding that
 * directory produced `Module not found` on Vercel while local builds stayed green.
 *
 * This check resolves every relative import in src/ against the tracked file
 * list and fails if any resolved file would be filtered out by .vercelignore.
 * It costs well under a second and runs in CI before the build.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const ignorePath = join(root, ".vercelignore");

if (!existsSync(ignorePath)) {
  console.log("✓ Vercel upload audit — no .vercelignore, nothing filtered");
  process.exit(0);
}

/** Turn one gitignore-ish line into a predicate over a repo-relative POSIX path. */
function compileRule(line) {
  const negated = line.startsWith("!");
  const raw = (negated ? line.slice(1) : line).replace(/^\/+/, "");
  const dirOnly = raw.endsWith("/");
  const pattern = raw.replace(/\/+$/, "");
  const anchored = pattern.includes("/");

  let source = "^";
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        // `**` spans directories; absorb an optional following slash too.
        if (pattern[i + 2] === "/") i += 2;
        else i += 1;
        source += ".*";
      } else {
        source += "[^/]*";
      }
    } else if (ch === "?") {
      source += "[^/]";
    } else if ("\\^$.|+()[]{}".includes(ch)) {
      source += `\\${ch}`;
    } else {
      source += ch;
    }
  }
  source += dirOnly ? "/.*$" : "(?:/.*)?$";
  if (!anchored) source = source.replace(/^\^/, "^(?:.*/)?");
  return { negated, re: new RegExp(source) };
}

const rules = readFileSync(ignorePath, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"))
  .map(compileRule);

function isIgnored(relPath) {
  const posix = relPath.split(sep).join("/");
  let ignored = false;
  for (const { negated, re } of rules) {
    if (re.test(posix)) ignored = !negated;
  }
  return ignored;
}

const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);
const trackedSet = new Set(tracked);
const ignoredCount = tracked.filter(isIgnored).length;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(?:ts|tsx|js|jsx|mjs|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const candidates = join(root, "src");
const extensions = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".json",
  ".css",
  ".webp",
  ".png",
  ".jpg",
  ".jpeg",
  ".avif",
  ".svg",
  ".woff",
  ".woff2",
  ".txt",
];
const importPattern = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|url\s*\(\s*)["'](\.[^"']+)["']/g;

function resolveImport(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  for (const suffix of extensions) {
    const rel = relative(root, base + suffix).split(sep).join("/");
    if (trackedSet.has(rel)) return rel;
  }
  for (const suffix of extensions) {
    for (const index of ["index.ts", "index.tsx", "index.js", "index.mjs"]) {
      const rel = relative(root, join(base + suffix, index)).split(sep).join("/");
      if (trackedSet.has(rel)) return rel;
    }
  }
  return null;
}

const dropped = [];
for (const file of walk(candidates)) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(importPattern)) {
    const target = resolveImport(file, match[1]);
    if (target && isIgnored(target)) {
      dropped.push(`${relative(root, file)} -> ${match[1]} (${target})`);
    }
  }
}

if (dropped.length) {
  console.error("✗ Vercel upload audit — build-time imports removed by .vercelignore:");
  for (const line of [...new Set(dropped)].slice(0, 30)) console.error(`  ${line}`);
  process.exit(1);
}

console.log(
  `✓ Vercel upload audit — ${tracked.length} tracked files, ${ignoredCount} ignored, 0 build-time imports dropped`,
);
