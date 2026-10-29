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
 * ---------------------------------------------------------------------------------------------
 * LANGKAH 3h-2 — THREE REAL VARIANTS INSTEAD OF TEN IDENTICAL FILES
 *
 * The bug this file used to have was not subtle once you looked: `render()` took no arguments. The
 * loop called it once per release, and every call produced the same SVG, the same ghost, the same
 * composition — so all ten outputs were byte-identical (5604 B, md5 338c6da857…, ten times). The
 * generator *was* running; it simply had no idea which release it was drawing.
 *
 * `render(release, index)` now takes the release, and the series has the three variants DESIGN.md §6
 * specifies — Monogram Crop / Typographic Heavy / Minimal Frame. Which one a release gets is a pure
 * function of its own verified data (`assignVariants` in ./lib/sleeve-variants.mjs), so it is
 * stable across builds and needs no
 * per-slug table: a remix is a bootleg (type-heavy), a declared single/ep/album is a catalogue
 * release (minimal frame), and an entry whose type the owner has not confirmed reads as a club
 * tool/dubplate (monogram crop). Change the data and the sleeve follows, deterministically.
 *
 * Round 19's rule — "no letters on a sleeve" — is REVERSED FOR ONE VARIANT, by the owner's explicit
 * instruction in Langkah 3h-2 ("Typographic Heavy: dominasi tipografi besar/bold"). The reason the
 * old rule existed still holds for the other two variants and is kept there: rasterised type cannot
 * reflow, cannot be selected and cannot be translated, and the card beside the sleeve already sets
 * the title in Relidux. So the title is printed only in variant B, where it *is* the artwork, and it
 * is printed in Anton — a face this repository already ships — never in an invented one.
 *
 * Rules that apply to all three: monochrome stock plus exactly one accent (`#0087FF`), radius 0
 * everywhere, no gradients, no blur, no WebGL, no invented artwork. Ground, ink and accent are the
 * site's own token values, restated here because this script runs outside the CSS build.
 *
 * ---------------------------------------------------------------------------------------------
 * TYPE RENDERING, WITHOUT A NEW DEPENDENCY
 *
 * sharp rasterises SVG through librsvg, which takes fonts from fontconfig. The site's Anton is a TTF
 * in `public/fonts/`, so this script points FONTCONFIG_FILE at that directory before sharp is
 * imported (set FONTCONFIG_FILE yourself to override). No font library, no headless browser, no
 * network: the same file the page loads is the file the sleeve prints.
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { anOutlinePath } from "../src/assets/an-shape.ts";
import { assignVariants, rankWithinVariant, VARIANT_LABEL } from "./lib/sleeve-variants.mjs";
import { releases } from "../src/content/releases.ts";

const root = process.cwd();
const outDir = join(root, "public", "assets", "covers");
const fontDir = join(root, "public", "fonts");
const markPath = join(root, "public", "brand", "an-mark.webp");
const SIZE = 1000;

/* --- fontconfig, before sharp ---------------------------------------------------------------- */

let fontConfigDir = null;
if (!process.env.FONTCONFIG_FILE && existsSync(fontDir)) {
  fontConfigDir = mkdtempSync(join(tmpdir(), "sleeve-fonts-"));
  mkdirSync(join(fontConfigDir, "cache"), { recursive: true });
  const config = join(fontConfigDir, "fonts.conf");
  writeFileSync(
    config,
    `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontDir}</dir>
  <cachedir>${join(fontConfigDir, "cache")}</cachedir>
</fontconfig>
`,
  );
  process.env.FONTCONFIG_FILE = config;
}

const { default: sharp } = await import("sharp");

/* --- the series -------------------------------------------------------------------------------- */

/**
 * The only three colours in the series, and they are the site's tokens: bone stock, ink, and the one
 * accent. The previous version printed its rule in press teal (#2E8C86) — a second hue that the
 * design rules do not allow anywhere else on the site.
 */
const STOCK = { bone: "#E8E6E1", ink: "#0A0A0E", signal: "#0087FF" };

/**
 * Variant A — the press object. One 45° corner cut out of the sheet (real alpha: the sleeve lies on
 * the wall instead of being pasted onto it), an ink spine, and the monogram cropped so hard that it
 * bleeds off two edges. A mark that runs out of its own frame reads as a design decision; a centred
 * one reads as a placeholder.
 */
const CUT = 150;
const SPINE = 64;

/* --- text -------------------------------------------------------------------------------------- */

/** Anton is condensed: a capital averages ~0.46 em. Used only to wrap, never to crop. */
const CAP_WIDTH = 0.46;

function escapeXml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Fit the title as up to three lines of caps at the largest size that fits the measure. Deterministic
 * arithmetic, no measurement pass: the same title always yields the same lines and the same size.
 */
function setTitle(title, usable, maxLines = 3) {
  const words = title.toUpperCase().split(/\s+/).filter(Boolean);
  for (let size = 232; size >= 96; size -= 8) {
    const capacity = Math.max(4, Math.floor(usable / (size * CAP_WIDTH)));
    const lines = [];
    for (const word of words) {
      const last = lines[lines.length - 1];
      if (last !== undefined && last.length + 1 + word.length <= capacity) {
        lines[lines.length - 1] = `${last} ${word}`;
      } else {
        lines.push(word);
      }
    }
    if (lines.length <= maxLines) return { size, lines };
  }
  return { size: 96, lines: words };
}

function metaLine(release, index) {
  const parts = [`RILIS ${String(index + 1).padStart(2, "0")} / ${String(releases.length).padStart(2, "0")}`];
  if (release.type) parts.push(release.type.toUpperCase());
  if (release.year) parts.push(String(release.year));
  return parts.join("  ·  ");
}

/* --- the three sheets -------------------------------------------------------------------------- */

function monogramCropSvg() {
  const frame = 36;
  const shape = `M0 0 H${SIZE - CUT} L${SIZE} ${CUT} V${SIZE} H0 Z`;
  const inner = `M${SPINE + frame} ${frame} H${SIZE - CUT + frame} L${SIZE - frame} ${CUT - frame} V${SIZE - frame} H${SPINE + frame} Z`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <path d="${shape}" fill="${STOCK.bone}"/>
  <rect x="0" y="0" width="${SPINE}" height="${SIZE}" fill="${STOCK.ink}"/>
  <path d="${inner}" fill="none" stroke="${STOCK.ink}" stroke-width="2"/>
  <rect x="${SPINE}" y="${SIZE - 12}" width="${SIZE - SPINE}" height="12" fill="${STOCK.signal}"/>
</svg>`);
}

function typographicSvg(release, index, rank) {
  const margin = 72;
  const usable = SIZE - margin * 2;
  const { size, lines } = setTitle(release.title, usable, 3);
  const leading = Math.round(size * (0.84 + (rank % 3) * 0.05));
  /* The block sits on the baseline grid of the sheet: its last line lands well above the meta line,
     and the first line is allowed to start slightly off the top edge — heavy type should look
     pressed against the trim, not floated in the middle. */
  const firstBaseline = SIZE - 300 - (lines.length - 1) * leading;
  const rows = lines
    .map((line, row) => `<text x="${margin}" y="${firstBaseline + row * leading}" font-family="Anton" font-size="${size}" fill="${STOCK.bone}">${escapeXml(line)}</text>`)
    .join("\n  ");

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${STOCK.ink}"/>
  <rect x="${margin}" y="${SIZE - 236}" width="168" height="8" fill="${STOCK.signal}"/>
  ${rows}
  <text x="${margin}" y="${SIZE - 132}" font-family="Anton" font-size="30" letter-spacing="6" fill="${STOCK.bone}" fill-opacity="0.62">${escapeXml(metaLine(release, index))}</text>
</svg>`);
}

/**
 * The accent bar has three positions, chosen by the slug: bottom-right, top-left, or centred under the
 * frame's optical centre. One bar, one place, never two — the variant's whole argument is restraint.
 */
/**
 * `rule` 2 draws a second hairline 10 px inside the first — still a minimal frame, still square,
 * but a different amount of ink around the same emptiness.
 */
function minimalFrameSvg(position, offset = 40, rule = 1) {
  const frame = 96;
  const barWidth = 132;
  const inset = frame + offset;
  const secondRule =
    rule === 2
      ? `<rect x="${frame + 10}" y="${frame + 10}" width="${SIZE - (frame + 10) * 2}" height="${SIZE - (frame + 10) * 2}" fill="none" stroke="${STOCK.ink}" stroke-width="1"/>`
      : "";
  const bar =
    position === 1
      ? `<rect x="${inset}" y="${inset}" width="${barWidth}" height="6" fill="${STOCK.signal}"/>`
      : position === 2
        ? `<rect x="${Math.round((SIZE - barWidth) / 2)}" y="${SIZE - inset - 6}" width="${barWidth}" height="6" fill="${STOCK.signal}"/>`
        : `<rect x="${SIZE - inset - barWidth}" y="${SIZE - inset - 6}" width="${barWidth}" height="6" fill="${STOCK.signal}"/>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${STOCK.bone}"/>
  <rect x="${frame}" y="${frame}" width="${SIZE - frame * 2}" height="${SIZE - frame * 2}" fill="none" stroke="${STOCK.ink}" stroke-width="2"/>
  ${secondRule}
  ${bar}
</svg>`);
}

/**
 * The mark as a flat silhouette at any size, drawn from the traced vector contours.
 *
 * `public/brand/an-mark.webp` is 174x112 — enlarging it to 1500 px for a hard crop produced a soft,
 * blurred edge, which on a sleeve reads as a badly scanned scan. `src/assets/an-shape.ts` is the
 * marching-squares trace of that same file (generated by `scripts/build-an-shape.mjs`), so the mark
 * can be re-drawn losslessly at sleeve scale instead of resampled.
 *
 * `crop` takes the source's own aspect ratio into account: the silhouette is 1.5536:1 inside a unit
 * box, so a square crop of width w is w / 1.5536 tall *of the mark*, not of the canvas.
 */
const AN_ASPECT = 1.55357;

function markSvg({ width, colour }) {
  const height = Math.round(width / AN_ASPECT);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <g transform="translate(${width / 2},${height / 2}) scale(${width / 1.2223},${width / 1.2223})">
    <path d="${anOutlinePath}" fill="${colour}" fill-rule="evenodd"/>
  </g>
</svg>`;
}

async function ghostMark(width, colour, opacity = 1) {
  const svg = Buffer.from(
    markSvg({ width, colour }).replace("<path", `<path fill-opacity="${opacity}"`),
  );
  /* Double the raster resolution internally, then downsample: librsvg antialiases, but at 1500 px
     the difference between a 1x and a 2x render is visible on the diagonal edges. */
  return sharp(svg, { density: 288 }).resize({ width, fit: "inside" }).png().toBuffer();
}

/**
 * Composite a layer that is deliberately larger than the sheet — sharp refuses a composite bigger
 * than its canvas, and the crop is the whole idea of variant A. The visible intersection is
 * extracted from the layer and placed, which is the same arithmetic with none of the refusal.
 */
async function compositeCropped(base, layer, left, top) {
  const { width: lw, height: lh } = await sharp(layer).metadata();
  const x0 = Math.max(0, -left);
  const y0 = Math.max(0, -top);
  const x1 = Math.min(lw, SIZE - left);
  const y1 = Math.min(lh, SIZE - top);
  if (x1 <= x0 || y1 <= y0) return base;
  const piece = await sharp(layer)
    .extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 })
    .png()
    .toBuffer();
  return base.composite([{ input: piece, left: Math.max(0, left), top: Math.max(0, top) }]);
}

/**
 * Draw one sleeve. `release` is the whole point: before Langkah 3h-2 this function took nothing, and
 * that is exactly why ten releases produced ten identical files.
 */
async function render(release, index, rank) {
  const variant = assignVariants(releases).get(release.slug);

  if (variant === "monogram-crop") {
    /* Cropped hard: 1500 px wide on a 1000 px sheet, pushed off the bottom-left so the A loses its
       foot and the N loses its stem. Solid ink, not a ghost — this variant is the mark, not a
       watermark. */
    /*
     * The crop is the variant, so the crop is what varies: four scales and four horizontal offsets,
     * all derived from the slug. Ten sleeves in one series, none of them the same photograph.
     *
     * The vertical crop is fixed at ~62 % of the mark's height on purpose. Earlier this printed
     * 38 % — only the apex of the A survived, and a triangle is not a monogram. At 62 % the A and
     * the N are both still read as letters while their feet are cut off by the trim, which is the
     * "fokus tipografi dipotong" in the brief rather than "unreadable".
     */
    /* Big enough that the mark overflows both the bottom and the top of the sheet: this variant is
       the mark at sleeve scale, not a mark sitting in the middle of one. */
    const scale = 1720 + rank * 150;
    const mark = await ghostMark(scale, STOCK.ink);
    const { width: mw, height: mh } = await sharp(mark).metadata();
    /*
     * The crop travels across the lockup, not by a hair: each rank shows a *different part* of the
     * monogram — the A's leg and crossbar, the pair together, then the N's diagonal. Tuning this by
     * twenty or thirty pixels per rank (the first attempt) produced four sleeves that read as the
     * same picture at thumbnail size on the wall, which is the failure this step is meant to end.
     */
    const left = -Math.round(mw * (0.02 + rank * 0.15));
    const top = -Math.round((mh - SIZE) * (0.5 + (rank % 3) * 0.12));
    return (await compositeCropped(sharp(monogramCropSvg()), mark, left, top))
      .webp({ quality: 84 })
      .toBuffer();
  }

  if (variant === "minimal-frame") {
    /* Negative space is the design: a 220 px mark under the optical centre, a hairline frame, one
       accent bar. Nothing else. */
    /*
     * Minimal Frame is mostly emptiness, which means the *proportion* of emptiness is the design:
     * the three arrangements are a small mark high in the sheet, a medium mark centred, and a large
     * mark low and left. Measuring the first version of this — where only the accent bar moved —
     * gave 1.8 % of pixels different between two sleeves, which is "different file, same picture"
     * and not what the brief asks for. Varying the mark's scale and optical centre by ~2.4x moves
     * roughly a quarter of the sheet.
     */
    const arrangement = [
      { size: 180, top: 250, offset: 40, rule: 1 },
      { size: 300, top: 350, offset: 96, rule: 2 },
      { size: 430, top: 470, offset: 40, rule: 1 },
    ][rank % 3];
    const mark = await ghostMark(arrangement.size, STOCK.ink, 0.92);
    return sharp(minimalFrameSvg(rank % 3, arrangement.offset, arrangement.rule))
      .composite([{ input: mark, left: Math.round((SIZE - arrangement.size) / 2), top: arrangement.top }])
      .webp({ quality: 84 })
      .toBuffer();
  }

  /* Typographic Heavy: the title is the artwork. The monogram is only a small maker's cap in the
     corner, so the sheet still belongs to the label. */
  const cap = await ghostMark(132, STOCK.bone, 0.5);
  return sharp(typographicSvg(release, index, rank))
    .composite([{ input: cap, left: SIZE - 204, top: SIZE - 204 }])
    .webp({ quality: 84 })
    .toBuffer();
}

/* --- main -------------------------------------------------------------------------------------- */

const force = process.argv.includes("--force");
const only = (process.argv.find((arg) => arg.startsWith("--only=")) ?? "").slice("--only=".length) || null;

async function main() {
  if (!existsSync(markPath)) throw new Error(`missing ${markPath} — run bash scripts/build-web-assets.sh first`);
  mkdirSync(outDir, { recursive: true });

  const variants = assignVariants(releases);
  const ranks = rankWithinVariant(releases);
  let written = 0;
  const skipped = [];

  for (const [index, release] of releases.entries()) {
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

    const bytes = await render(release, index, ranks.get(release.slug) ?? 0);
    writeFileSync(target, bytes);
    written += 1;
    console.log(
      `sleeve ${release.slug}@sleeve.webp  ${VARIANT_LABEL[variants.get(release.slug)].padEnd(19)} ${Math.round(bytes.byteLength / 1024)} KB`,
    );
  }

  console.log(`\n${written} sleeve(s) written to public/assets/covers/`);
  for (const line of skipped) console.log(`skip   ${line}`);
  if (written === 0 && skipped.length === 0) console.log("nothing to do");
}

try {
  await main();
} finally {
  if (fontConfigDir) rmSync(fontConfigDir, { recursive: true, force: true });
}
