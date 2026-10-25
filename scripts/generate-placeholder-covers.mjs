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
 * (src/content/covers.ts) can tell the two apart — and because a sleeve carries no type at all, the
 * card under it always prints the release title itself, in Relidux like everything else.
 *
 * The sleeve is built only from things that are verified: the series ground, the AN monogram as a
 * ghost, and one misregistration rule in the series colour. No stock photo, no invented artwork, no
 * type — and nothing that pretends to be owner-supplied art.
 *
 * Typography: none. Round 19 took every letter off the sleeve — a placeholder that prints its own
 * title in a face the site does not ship is the ransom-note effect the owner rejected, and
 * rasterised type cannot reflow, be selected or be translated. Titles live in the page as Relidux
 * HTML text; the sleeve is ground, ghost monogram and misregistration rule.
 *
 * History, for the archaeologists: the sleeve face changed grotesque 800 → Instrument Serif
 * (2026-10-24, D-108) → Anton + JetBrains Mono (round 13) → nothing (round 19).
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







function sleeveSvg(release) {
  const series = seriesFor(release.slug);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${series.ground}"/>

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
  const width = series.paper ? 460 : 360;
  const ghost = await faded(await ghostMark(width, series.ghost), series.ghostOpacity);
  /* Centred: with the title gone the mark IS the sleeve's subject, and a centred mark on a square
     is the one composition that reads as deliberate at every crop. */
  const left = Math.round((SIZE - width) / 2);
  const top = Math.round((SIZE - width) / 2) - (series.paper ? 20 : 0);

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
