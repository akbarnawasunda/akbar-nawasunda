#!/usr/bin/env node
/**
 * Integrity check for the official asset directory.
 *
 *   node scripts/check-assets.mjs            verify against src/assets/asset-checksums.json
 *   node scripts/check-assets.mjs --update   rewrite the checksum record (deliberate step only)
 *
 * Fails (exit 1) when a file is missing, changed, or not recorded. Format mismatches
 * (for example a JPEG saved with a .png extension) are reported as warnings: they are real
 * findings from the audit and are documented in src/assets/manifest.ts, not silently fixed.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetDir = join(root, "AKBAR-NAWASUNDA-ASSETS");
const recordPath = join(root, "src/assets/asset-checksums.json");
const update = process.argv.includes("--update");

/** Identify the real container from magic bytes; returns null when unknown. */
function sniff(buf) {
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 8 && buf.toString("ascii", 0, 4) === "\x89PNG") return "png";
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp" && buf.toString("ascii", 8, 12).startsWith("avif")) return "avif";
  return null;
}

const expectedByExt = { ".webp": "webp", ".avif": "avif", ".jpg": "jpeg", ".jpeg": "jpeg", ".png": "png" };

const files = readdirSync(assetDir).filter((name) => statSync(join(assetDir, name)).isFile()).sort();
const current = {};
const warnings = [];

for (const name of files) {
  const buf = readFileSync(join(assetDir, name));
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const detected = sniff(buf);
  current[name] = { sha256, bytes: buf.length, detected: detected ?? "unknown" };

  const ext = extname(name).toLowerCase();
  if (ext in expectedByExt) {
    if (detected === null) warnings.push(`${name}: not a recognised image (first bytes do not match a known format)`);
    else if (detected !== expectedByExt[ext]) warnings.push(`${name}: extension says ${ext} but content is ${detected}`);
  } else if (detected === null) {
    warnings.push(`${name}: no recognised extension and not an image (${buf.length} bytes)`);
  }
}

if (update) {
  writeFileSync(recordPath, JSON.stringify({ generatedBy: "scripts/check-assets.mjs --update", files: current }, null, 2) + "\n");
  console.log(`Wrote ${files.length} checksum entries to ${recordPath}`);
  process.exit(0);
}

const record = JSON.parse(readFileSync(recordPath, "utf8")).files;
const errors = [];
for (const name of Object.keys(record)) {
  if (!(name in current)) errors.push(`missing: ${name}`);
  else if (current[name].sha256 !== record[name].sha256) errors.push(`changed: ${name}`);
}
for (const name of Object.keys(current)) {
  if (!(name in record)) errors.push(`unrecorded (new file): ${name}`);
}

console.log(`Checked ${files.length} files in AKBAR-NAWASUNDA-ASSETS/`);
for (const w of warnings) console.log(`  warning: ${w}`);
for (const e of errors) console.log(`  ERROR: ${e}`);
if (errors.length > 0) {
  console.log("Asset check FAILED. If the change is intentional, run: node scripts/check-assets.mjs --update");
  process.exit(1);
}
console.log(`Asset check passed (${warnings.length} warning(s) documented in src/assets/manifest.ts).`);
