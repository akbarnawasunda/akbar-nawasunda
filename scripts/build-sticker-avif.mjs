#!/usr/bin/env node
/**
 * Sticker-portrait AVIF, with the alpha channel intact.
 *
 * `convert input.png -resize ... out.avif` (ImageMagick's AVIF delegate) writes an **opaque** file:
 * the cut-out's transparent area comes out as solid black. In every AVIF-capable browser that is a
 * black rectangle around the artist in the hero — which is exactly what shipped between round 3 and
 * round 4 and looked like an arbitrary dark panel behind the portrait.
 *
 * sharp preserves alpha, but only when the resize and the encode are not fused: piping through PNG
 * first is what keeps the 720/960/1200 encodes transparent (480 happened to survive fused).
 *
 * Usage: node scripts/build-sticker-avif.mjs   (called by scripts/build-web-assets.sh)
 */
import { statSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

const root = process.cwd();
const source = join(root, "AKBAR-NAWASUNDA-ASSETS/akbar-nawasunda-sticker-portrait.png");
const widths = [480, 720, 960, 1200];

for (const width of widths) {
  const out = join(root, `public/media/sticker-${width}.avif`);
  const flattened = await sharp(source).resize({ width }).png().toBuffer();
  await sharp(flattened).avif({ quality: 58, alphaQuality: 80, effort: 4 }).toFile(out);

  const meta = await sharp(out).metadata();
  if (!meta.hasAlpha) throw new Error(`${out} lost its alpha channel`);
  console.log(`✓ sticker-${width}.avif ${meta.width}x${meta.height} ${statSync(out).size} B`);
}
