/**
 * Langkah 3k — the archive's high-resolution derivatives.
 *
 * Why this file exists instead of another `convert` line in build-web-assets.sh: the archive tiles are
 * 439 x 549 CSS px at 1440, which is 878 x 1098 device px on a 2x screen. Every tile was being fed a
 * file built for a much smaller role — the AN mark at 174 px, the lockup at 400, the stage frame at
 * 480 — so the browser was stretching 1.5x to 3.6x and the archive looked soft next to the hero.
 *
 * The originals in docs/05-CONTENT-AND-ASSETS/ and AKBAR-NAWASUNDA-ASSETS/ are large enough to fix
 * that (1792x1232, 1600x1600, 1440x1440), so the fix is more pixels in, not fewer pixels out.
 *
 * These are *sources*, not the bytes the browser downloads: every tile still goes through
 * next/image, which re-encodes at the width the device asks for. A 960 px source therefore costs a
 * phone nothing — it only means the 750w variant the phone requests is a real 750 px image.
 *
 * Reproduce with: node scripts/build-archive-hires.mjs
 * Requires sharp (already a Next dependency; build-web-assets.sh is ImageMagick, this is not).
 */
import { statSync, writeFileSync } from "node:fs";

import sharp from "sharp";

const ROOT = new URL("..", import.meta.url).pathname;

const JOBS = [
  {
    // Trimmed AN monogram: the same 1792x1232 original the nav mark comes from, kept 960 px wide so
    // the archive tile at 2x has real pixels. Lossless WebP keeps the 1 px white stroke clean.
    src: "docs/05-CONTENT-AND-ASSETS/assets/akbar-an-mark-transparent.png",
    out: "public/brand/an-mark-960.webp",
    width: 960,
    trim: true,
    quality: 94,
  },
  {
    // Full lockup (mark + wordmark + RMX tag), archive/lightbox only — the nav keeps the 174 px mark.
    src: "docs/05-CONTENT-AND-ASSETS/assets/akbar-nawasunda-full-transparent.png",
    out: "public/brand/lockup-960.webp",
    width: 960,
    trim: true,
    quality: 92,
  },
  {
    // Night-frequency stage frame: the 1440 px original was being resized down to 700, and the tile
    // asked for 1098 device px. 1000 px covers the common case; q64 because next/image re-encodes
    // and the grain in this photograph does not survive a second lossy pass at low quality.
    src: "AKBAR-NAWASUNDA-ASSETS/akbar-night-frequency-stage-optimized.webp",
    out: "public/media/stage-1000.webp",
    width: 1000,
    trim: false,
    quality: 64,
  },
];

for (const job of JOBS) {
  const input = `${ROOT}${job.src}`;
  let image = sharp(input, { limitInputPixels: false });
  if (job.trim) {
    image = sharp(await image.trim({ threshold: 10 }).toBuffer());
  }
  const source = await image.metadata();
  const buffer = await image
    .resize({ width: job.width })
    .webp({ quality: job.quality, effort: 6 })
    .toBuffer();
  writeFileSync(`${ROOT}${job.out}`, buffer);
  const written = await sharp(buffer).metadata();
  const kb = (statSync(`${ROOT}${job.out}`).size / 1024).toFixed(1);
  console.log(
    `${job.out}  ${source.width}x${source.height} -> ${written.width}x${written.height}  ${kb} KB`,
  );
}
