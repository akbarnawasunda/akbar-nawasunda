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
 * Typography: renders with Anton 400 (display, all caps) and JetBrains Mono 500 (labels). Both must be
 * installed locally for the rasteriser to find them — fontconfig sees ~/.fonts; the display face is
 * the same OFL file the site ships (`src/assets/fonts/anton-latin-400.woff2`, unpacked to
 * ~/.fonts/Anton-Regular.ttf so librsvg can use it). Without them the text falls back to a system
 * sans and the file looks wrong, so check the result.
 *
 * The display face changed twice: grotesque 800 → Instrument Serif (2026-10-24, D-108) → Anton
 * (round 13, "SALAH CETAK"). The sleeves are the loudest type on the site — ten of them, one per
 * release — and a serif cover sitting next to a condensed-sans page reads as two different sites.
 * The titles are set in caps now for the same reason: the sleeve is printed matter, not a caption.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

import { releases } from "../src/content/releases.ts";

const force = process.argv.includes("--force");
/** Only regenerate one release: `node scripts/generate-placeholder-covers.mjs --force --only=lali-dalane`. */
const only = (process.argv.find((arg) => arg.startsWith("--only=")) ?? "").slice("--only=".length) || null;
const root = process.cwd();
const outDir = join(root, "public", "assets", "covers");
const markPath = join(root, "public", "brand", "an-mark.webp");
const SIZE = 1000;
const PAD = 72;
const COLUMN = 660; // text column; the ghost sits to the right of it
/*
 * Anton is condensed, so it holds a square at a much larger size than the serif it replaced: a
 * three-line caps block at 150 is 450 px of 1000. The ladder starts high and steps down until the
 * title fits three lines, so short titles get billboard type and long ones stay inside the margin.
 */
const TITLE_SIZES = [190, 172, 154, 138, 122, 108, 94, 82, 72];

/**
 * Two sleeve series (D-117).
 *
 * Ten sleeves with one layout is the same "nine identical boxes" problem the bento grid was built
 * to avoid — and it is exactly what makes a set of generated covers read as generated. A real label
 * prints a series: same mark, same grid, one thing inverted. So half the catalogue is ink-on-paper
 * and half is paper-on-ink, picked by a hash of the slug — deterministic (the sleeve for a given
 * release never changes between builds, so the grid cannot reshuffle) but not alternating in a way
 * the eye can count.
 *
 * This is still not artwork. Artwork is the owner's file or the platform's, fetched by
 * `npm run covers:fetch` / the Covers Action. This is the designed floor under that.
 */
/*
 * The palette is the R13 press palette, not the R8 screen palette: the ground matches the page
 * (`--color-bg-base` #0A0A0E) so a sleeve sitting on the catalogue wall looks printed on the same
 * stock, and the 4 px rule carries one of the two misregistration inks — press cyan on the ink
 * series, poster red on the paper one — instead of the deleted #0087FF.
 */
const SERIES = {
  ink: { paper: false, ground: "#0A0A0E", title: "#E8E6E1", label: "#9ECFC9", ghost: "#E8E6E1", ghostOpacity: 0.11, rule: "#2E8C86", ruleEdge: "bottom" },
  paper: { paper: true, ground: "#E8E6E1", title: "#12120F", label: "#14263A", ghost: "#12120F", ghostOpacity: 0.09, rule: "#C93A22", ruleEdge: "top" },
};

function hash(text) {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

function seriesFor(slug) {
  return SERIES[hash(slug) % 2 === 0 ? "ink" : "paper"];
}

/** XML-safe text for the SVG. Titles contain em dashes and commas. */
function xml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Anton advance widths, in 1000ths of the em, read out of the actual font file (fontTools / hmtx,
 * unitsPerEm 2048). Measuring beats guessing: Anton's "M" is 0.746 em and its "I" is 0.227 em, so a
 * flat per-character estimate wraps a caps title in the wrong place. The map covers the caps, digits
 * and punctuation the catalogue actually contains; anything else falls back to 0.48 em.
 */
const DISPLAY_WIDTHS = {
  A: 0.485, B: 0.479, C: 0.474, D: 0.493, E: 0.412, F: 0.399, G: 0.485, H: 0.499, I: 0.227,
  J: 0.466, K: 0.472, L: 0.397, M: 0.746, N: 0.498, O: 0.486, P: 0.472, Q: 0.494, R: 0.477,
  S: 0.461, T: 0.396, U: 0.474, V: 0.469, W: 0.712, X: 0.484, Y: 0.446, Z: 0.41,
  0: 0.494, 1: 0.331, 2: 0.494, 3: 0.494, 4: 0.494, 5: 0.494, 6: 0.494, 7: 0.494, 8: 0.494,
  9: 0.494,
  " ": 0.234, ".": 0.229, ",": 0.236, "-": 0.311, "–": 0.311, "—": 0.563, "'": 0.214, "’": 0.232,
  "/": 0.405, "&": 0.52, "(": 0.291, ")": 0.291, "!": 0.229, "?": 0.492, ":": 0.242, "·": 0.234,
  "@": 0.864,
};

/* Caps at display size want a hair of air, not the negative tracking a lowercase serif took. */
const TRACKING = 0.015;

/** Advance width of one line, including the tracking. */
function measure(text, size) {
  const glyphs = [...text];
  const sum = glyphs.reduce((total, char) => total + (DISPLAY_WIDTHS[char] ?? 0.48), 0);
  return (sum + glyphs.length * TRACKING) * size;
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

function sleeveSvg(release) {
  const series = seriesFor(release.slug);
  /* Caps: Anton's lowercase is a different, lighter voice — the sleeve wants the shout. */
  const { size, lines } = fitTitle(release.title.toUpperCase());
  /* 0.92 leading stacks the lines until they touch, which is what makes a sleeve read as a poster
     rather than a paragraph with big type. */
  const lineHeight = Math.round(size * 0.92);
  /* Bottom-anchored block: the title rests on the bottom margin and the eyebrow sits above it. A
     top-anchored block left two thirds of the square empty on short titles, which is what made the
     old sleeves look like an unstyled template rather than a record cover. There is no "RILIS 01/10"
     pill any more: the grid already prints an index, and two indices in one tile read as a mistake. */
  const lastBaseline = SIZE - PAD - 44;
  const firstBaseline = lastBaseline - (lines.length - 1) * lineHeight;
  const eyebrowY = firstBaseline - Math.round(size * 1.08);

  const title = lines
    .map(
      (line, lineIndex) =>
        `<text x="${PAD}" y="${firstBaseline + lineIndex * lineHeight}" font-family="Anton" font-weight="400" font-size="${size}" letter-spacing="${(size * TRACKING).toFixed(2)}" fill="${series.title}">${xml(line)}</text>`,
    )
    .join("");

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${series.ground}"/>

  <text x="${PAD}" y="${eyebrowY}" font-family="JetBrains Mono" font-weight="500" font-size="21" letter-spacing="3.4" fill="${series.label}">${xml(eyebrow(release))}</text>

  ${title}

  <rect x="0" y="${series.ruleEdge === "bottom" ? SIZE - 4 : 0}" width="${SIZE}" height="4" fill="${series.rule}"/>
</svg>`);
}

/**
 * The AN mark as a watermark: a flat silhouette in one ink, not the coloured logo at low opacity.
 *
 * The first version simply faded the original file, which kept its blue — at 10% that reads as a
 * smudge, and on paper it disappeared entirely. Silhouetting it from the alpha channel means the
 * mark prints the same way on both grounds, and its colour can be the series ink.
 */
async function ghostMark(width, colour) {
  const base = await sharp(markPath).resize({ width, fit: "inside" }).ensureAlpha().png().toBuffer();
  const { width: w, height: h } = await sharp(base).metadata();
  const alpha = await sharp(base).extractChannel("alpha").raw().toBuffer();
  const solid = await sharp({ create: { width: w, height: h, channels: 3, background: colour } })
    .png()
    .toBuffer();

  return sharp(solid)
    .joinChannel(alpha, { raw: { width: w, height: h, channels: 1 } })
    .png()
    .toBuffer();
}

/** Opacity comes from one flat veil over the silhouette — the file stays tiny. */
async function faded(input, opacity) {
  const { width: w, height: h } = await sharp(input).metadata();
  const veil = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#FFFFFF" fill-opacity="${opacity}"/></svg>`,
  );
  return sharp(input).composite([{ input: veil, blend: "dest-in" }]).png().toBuffer();
}

async function render(release) {
  const series = seriesFor(release.slug);
  const svg = sleeveSvg(release);
  /* The paper series prints a larger, lower mark: white space at the top of a pale sleeve reads as
     an empty file, while the same area on ink reads as a sleeve. */
  const ghost = await faded(await ghostMark(series.paper ? 460 : 360, series.ghost), series.ghostOpacity);
  const left = series.paper ? 500 : 586;
  const top = series.paper ? 300 : 168;

  const composed = await sharp(svg)
    .composite([{ input: ghost, left, top }])
    .webp({ quality: 84 })
    .toBuffer();

  return composed;
}

async function main() {
  if (!existsSync(markPath)) throw new Error(`missing ${markPath} — run bash scripts/build-web-assets.sh first`);
  mkdirSync(outDir, { recursive: true });

  let written = 0;
  const skipped = [];

  for (const release of releases) {
    if (only && release.slug !== only) continue;
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

    const bytes = await render(release);
    writeFileSync(target, bytes);
    written += 1;
    console.log(`sleeve ${release.slug}@sleeve.webp (${Math.round(bytes.byteLength / 1024)} KB)`);
  }

  console.log(`\n${written} sleeve(s) written to public/assets/covers/`);
  for (const line of skipped) console.log(`skip   ${line}`);
  if (written === 0 && skipped.length === 0) console.log("nothing to do");
}

await main();
