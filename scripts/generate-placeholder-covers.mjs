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

/**
 * One sleeve series, round 21 (D-117 reversed).
 *
 * D-117 split the catalogue into two series — ink-on-paper and paper-on-ink, picked by a slug hash —
 * on the theory that a real label prints a series with one thing inverted. On the wall it read the
 * opposite way: light and dark boxes next to each other with no logic the eye can find ("kacau",
 * owner's word, round 21), and the ink half was so close to the page black that those cards looked
 * like empty holes rather than sleeves. A series only reads as a series when the grid shows its
 * rule; a hash is not a rule the eye can see.
 *
 * So: one series, every sleeve, and it is given presence instead of hiding — a ground one step
 * lighter than the page so the box reads as an object on the wall, a hairline frame like a printed
 * crop mark, the ghost mark a little louder, and the misregistration rule in press cyan at the
 * bottom edge. Still no type, still no invented artwork: ground, frame, ghost, rule.
 */
const SERIES = {
  ground: "#E8E6E1",
  frame: "#0A0A0E",
  ghost: "#0A0A0E",
  ghostOpacity: 0.26,
  rule: "#2E8C86",
};







/*
 * Round 25, series v4 — the die-cut press object.
 *
 * Every sleeve in the series is cut: one 45° corner off the top-right, and the cut is real — the
 * outside of the shape is transparent, so a sleeve reads as a physically cut object lying on
 * whatever is behind it (the ink plinth on the wall, the ink page in the rail) instead of a
 * rectangle pasted on a slide. One cut, same corner, every sleeve: a series decision, not
 * per-cover decoration.
 *
 * The object itself gets the anatomy of a pressed jacket: an ink spine down the left edge, the
 * label's monogram as a strong ghost bleeding off the bottom-right, one misregistration rule in
 * the series teal under the type-free field, and a crop hairline that follows the die. Round 19's
 * ban on sleeve typography stands — a sleeve that prints its own title in rasterised type cannot
 * reflow, be selected or be translated, and the card beside it already sets the title in Relidux.
 */
const CUT = 150;
const SPINE = 64;

function sleeveSvg() {
  const frame = 36;
  const shape = `M0 0 H${SIZE - CUT} L${SIZE} ${CUT} V${SIZE} H0 Z`;
  const inner = `M${SPINE + frame} ${frame} H${SIZE - CUT + frame} L${SIZE - frame} ${CUT - frame} V${SIZE - frame} H${SPINE + frame} Z`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <path d="${shape}" fill="${SERIES.ground}"/>

  <!-- The spine: a jacket is bound on one edge. Ink, full height, under everything else. -->
  <rect x="0" y="0" width="${SPINE}" height="${SIZE}" fill="${SERIES.frame}"/>

  <!-- The crop-mark hairline follows the same die-cut, inset, so the sleeve reads as a printed
       sheet instead of a hole in the wall. -->
  <path d="${inner}" fill="none" stroke="${SERIES.frame}" stroke-width="2"/>

  <rect x="${SPINE}" y="${SIZE - 10}" width="${SIZE - SPINE}" height="10" fill="${SERIES.rule}"/>
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

async function render() {
  const svg = sleeveSvg();
  /*
   * Round 24, series v3: bone stock, and the mark printed large and cropped — it bleeds off the
   * top-left corner instead of sitting centred like a logo on a slide. A centred ghost reads as
   * placeholder; a cropped one reads as a design decision, because only a designer pushes a mark
   * off its own frame on purpose.
   */
  const width = 760;
  const ghost = await faded(await ghostMark(width, SERIES.ghost), SERIES.ghostOpacity);
  /* Bleeding off the bottom-right, opposite the spine: the mark is the label's signature on the
     jacket, and a signature that fits inside its own frame reads as a logo, not as ink. */
  const left = SIZE - 520;
  const top = SIZE - 470;

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

    const bytes = await render();
    writeFileSync(target, bytes);
    written += 1;
    console.log(`sleeve ${release.slug}@sleeve.webp (${Math.round(bytes.byteLength / 1024)} KB)`);
  }

  console.log(`\n${written} sleeve(s) written to public/assets/covers/`);
  for (const line of skipped) console.log(`skip   ${line}`);
  if (written === 0 && skipped.length === 0) console.log("nothing to do");
}

await main();
