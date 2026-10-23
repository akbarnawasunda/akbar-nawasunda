#!/usr/bin/env node
/**
 * Level 3 of the cover waterfall: render a designed sleeve for every verified release that has no
 * artwork file yet.
 *
 *   node scripts/generate-placeholder-covers.mjs            # only missing sleeves
 *   node scripts/generate-placeholder-covers.mjs --force    # re-render all of them
 *   npx tsx scripts/generate-placeholder-covers.mjs         # same, on older Node
 *
 * Output: public/assets/covers/<slug>@sleeve.webp — 1000x1000, WebP, target under 150 KB.
 *
 * Why a separate file name instead of <slug>.webp: `<slug>.webp` is the slot for real artwork (the
 * owner's file, or Spotify's via `npm run covers:fetch`). Keeping the generated sleeve in its own
 * slot means dropping a real cover in never has to delete anything, and the site's resolver
 * (src/content/covers.ts) can tell the two apart — a sleeve already has the title printed on it, so
 * the card under it does not need to print the same words again.
 *
 * The sleeve is built only from things that are verified: the release title, the original artist and
 * year when they are known, the AN monogram, and the brand palette. No stock photo, no invented
 * artwork, no genre label per release (genres are verified for the artist, not for each song).
 *
 * Typography: renders with Syne (display) and JetBrains Mono (labels), the two families the site
 * ships. Both must be installed locally for the rasteriser to find them — `fontconfig` sees
 * ~/.fonts. Without them the text falls back to a system sans and the file will look wrong, so
 * check the result; the committed sleeves were rendered with Syne 800 / JetBrains Mono 500.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

import { releases } from "../src/content/releases.ts";

const force = process.argv.includes("--force");
const root = process.cwd();
const outDir = join(root, "public", "assets", "covers");
const markPath = join(root, "public", "brand", "an-mark.webp");
const SIZE = 1000;
const PAD = 72;
const COLUMN = 660; // text column; the ghost sits to the right of it
const TITLE_SIZES = [60, 52, 46, 40];

/** XML-safe text for the SVG. Titles contain em dashes and commas. */
function xml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Syne ExtraBold advance widths, in 1000ths of the em (unitsPerEm = 1000), read out of the font
 * file once. Syne is unusually wide — an "M" is 1.58 em — so guessing at 0.55 em per character
 * overflows the sleeve badly. Missing glyphs fall back to 0.6 em.
 */
const SYNE_800 = {
  A: 1160, B: 1140, C: 1316, D: 1302, E: 1140, F: 1128, G: 1340, H: 1280, I: 420, J: 1004, K: 1215,
  L: 943, M: 1580, N: 1300, O: 1330, P: 1177, Q: 1330, R: 1232, S: 1056, T: 1100, U: 1289, V: 1160,
  W: 1882, X: 1140, Y: 1070, Z: 1200,
  a: 1063, b: 1098, c: 994, d: 1098, e: 994, f: 674, g: 969, h: 1008, i: 364, j: 364, k: 942,
  l: 360, m: 1654, n: 998, o: 1016, p: 1063, q: 1098, r: 563, s: 842, t: 628, u: 998, v: 918,
  w: 1462, x: 980, y: 930, z: 896,
  0: 1066, 1: 529, 2: 1003, 3: 1055, 4: 1094, 5: 1015, 6: 1133, 7: 1153, 8: 1081, 9: 1158,
  " ": 310, ".": 354, ",": 303, "-": 590, "'": 300, "/": 622, "&": 1220, "(": 405, ")": 405,
  "!": 394, "?": 864,
};

/** Advance width of one line, including the -0.02em letter-spacing the SVG applies. */
function measure(text, size) {
  const glyphs = [...text];
  const sum = glyphs.reduce((total, char) => total + (SYNE_800[char] ?? 600) / 1000, 0);
  return (sum - glyphs.length * 0.02) * size;
}

/** Greedy word wrap at a fixed column width. */
function wrap(text, size, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Largest size (down to the smallest allowed) whose wrap still fits three lines. */
function fitTitle(title) {
  for (const size of TITLE_SIZES) {
    const lines = wrap(title, size, COLUMN);
    if (lines.length <= 3 && lines.every((line) => measure(line, size) <= COLUMN)) return { size, lines };
  }
  const size = TITLE_SIZES[TITLE_SIZES.length - 1];
  return { size, lines: wrap(title, size, COLUMN).slice(0, 3) };
}

/** Mono label: original artist, verified year, era — only what is actually known. */
function eyebrow(release) {
  const parts = [release.source ? release.source.toUpperCase() : "RILIS"];
  if (release.year) parts.push(String(release.year));
  if (release.era) parts.push(release.era.toUpperCase());
  return parts.join(" · ");
}

function sleeveSvg(release, index, total) {
  const { size, lines } = fitTitle(release.title);
  const lineHeight = Math.round(size * 1.04);
  const firstBaseline = 420;
  const pillTop = Math.max(firstBaseline + (lines.length - 1) * lineHeight + 56, 608);
  const pillLabel = `RILIS ${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  const pillWidth = Math.round(measure(pillLabel, 18) + 44);

  const title = lines
    .map(
      (line, lineIndex) =>
        `<text x="${PAD}" y="${firstBaseline + lineIndex * lineHeight}" font-family="Syne" font-weight="800" font-size="${size}" letter-spacing="${(size * -0.02).toFixed(2)}" fill="#FFFFFF">${xml(line)}</text>`,
    )
    .join("");

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0087FF"/>
      <stop offset="1" stop-color="#7800FF"/>
    </linearGradient>
  </defs>

  <rect width="${SIZE}" height="${SIZE}" fill="#101014"/>

  <text x="${PAD}" y="352" font-family="JetBrains Mono" font-weight="500" font-size="21" letter-spacing="3.4" fill="#A1A1B5">${xml(eyebrow(release))}</text>

  ${title}

  <rect x="${PAD}" y="${pillTop}" width="${pillWidth}" height="46" rx="23" fill="#1A1A22" stroke="#2A2A38" stroke-width="1"/>
  <text x="${PAD + 22}" y="${pillTop + 30}" font-family="JetBrains Mono" font-weight="500" font-size="18" letter-spacing="2.2" fill="#A1A1B5">${xml(pillLabel)}</text>

  <rect x="0" y="${SIZE - 4}" width="${SIZE}" height="4" fill="url(#rule)"/>
</svg>`);
}

/** The AN mark at 10%: alpha is multiplied down so it reads as a watermark, not as a logo. */
async function ghostMark(width) {
  const base = await sharp(markPath).resize({ width, fit: "inside" }).png().toBuffer();
  const { width: w, height: h } = await sharp(base).metadata();
  const veil = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#FFFFFF" fill-opacity="0.1"/></svg>`,
  );
  return sharp(base)
    .ensureAlpha()
    .composite([{ input: veil, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function render(release, index, total) {
  const svg = sleeveSvg(release, index, total);
  const ghost = await ghostMark(360);

  const composed = await sharp(svg)
    .composite([{ input: ghost, left: 586, top: 540 }])
    .webp({ quality: 84 })
    .toBuffer();

  return composed;
}

async function main() {
  if (!existsSync(markPath)) throw new Error(`missing ${markPath} — run bash scripts/build-web-assets.sh first`);
  mkdirSync(outDir, { recursive: true });

  let written = 0;
  const skipped = [];

  for (const [index, release] of releases.entries()) {
    const realArtwork = ["webp", "avif", "jpg", "jpeg", "png"].some((ext) =>
      existsSync(join(outDir, `${release.slug}.${ext}`)),
    );
    if (realArtwork && !force) {
      skipped.push(`${release.slug} (has real artwork)`);
      continue;
    }

    const target = join(outDir, `${release.slug}@sleeve.webp`);
    if (existsSync(target) && !force) {
      skipped.push(`${release.slug} (sleeve exists)`);
      continue;
    }

    const bytes = await render(release, index, releases.length);
    writeFileSync(target, bytes);
    written += 1;
    console.log(`sleeve ${release.slug}@sleeve.webp (${Math.round(bytes.byteLength / 1024)} KB)`);
  }

  console.log(`\n${written} sleeve(s) written to public/assets/covers/`);
  for (const line of skipped) console.log(`skip   ${line}`);
  if (written === 0 && skipped.length === 0) console.log("nothing to do");
}

await main();
