#!/usr/bin/env node
/**
 * Turn the owner's real AN mark into vector contours for the 3D scene.
 *
 *   node scripts/build-an-shape.mjs
 *
 * Input  public/brand/an-mark.webp   (174x112, alpha channel = the mark itself)
 * Output src/assets/an-shape.ts      (closed rings in normalised units, holes included)
 *
 * Why this exists: the 3D monogram must be the owner's logo, not a redrawn approximation. The mark
 * ships as a raster with alpha, so its silhouette is traced once, offline, and the result is
 * committed as data. `d3-contour` runs marching squares over the alpha channel; the first ring of a
 * polygon is the outline and the rest are holes, which maps one-to-one onto THREE.Shape + holes.
 *
 * The trace is deterministic: same alpha in, same numbers out. Re-run it only if the mark file
 * changes.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { contours } from "d3-contour";
import sharp from "sharp";

const SOURCE = join(process.cwd(), "public/brand/an-mark.webp");
const TARGET = join(process.cwd(), "src/assets/an-shape.ts");

/** The mark is 174x112; keep the aspect and normalise the longest side to 1. */
const THRESHOLD = 0.5;
/** Ramer–Douglas–Peucker tolerance in normalised units: 0.0006 keeps the logo's spikes, drops haze. */
const SIMPLIFY = 0.0006;
/**
 * Trace at 4x, blur the alpha by ~1 source pixel: a 174px raster gives marching squares a staircase
 * on every diagonal, and the extrusion turns each step into a visible shelf. Upscaling first makes
 * the diagonal land between pixels; the blur keeps the trace from hugging jpeg-ish noise.
 */
const UPSCALE = 4;
const BLUR_SIGMA = 0.8;

/** Ramer–Douglas–Peucker on an open polyline. */
function rdp(points, tolerance) {
  if (points.length < 3) return points;
  const first = points[0];
  const last = points[points.length - 1];
  const perpendicular = (point) => {
    const dx = last[0] - first[0];
    const dy = last[1] - first[1];
    const length = Math.hypot(dx, dy);
    if (length === 0) return Math.hypot(point[0] - first[0], point[1] - first[1]);
    return Math.abs(dy * point[0] - dx * point[1] + last[0] * first[1] - last[1] * first[0]) / length;
  };
  let index = -1;
  let max = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = perpendicular(points[i]);
    if (d > max) {
      max = d;
      index = i;
    }
  }
  if (max <= tolerance) return [first, last];
  return [...rdp(points.slice(0, index + 1), tolerance).slice(0, -1), ...rdp(points.slice(index), tolerance)];
}

/**
 * Closed-ring simplification.
 *
 * A marching-squares ring repeats its first point at the end, which makes plain RDP collapse the
 * whole ring to two points. Splitting at the vertex farthest from the start gives two open arcs that
 * RDP can actually measure, and the join keeps the ring closed.
 */
function simplifyRing(ring, tolerance) {
  const points = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.slice(0, -1)
    : ring;
  if (points.length < 4) return [...points, points[0]];

  const start = points[0];
  let far = 1;
  let best = -1;
  for (let i = 1; i < points.length; i += 1) {
    const d = Math.hypot(points[i][0] - start[0], points[i][1] - start[1]);
    if (d > best) {
      best = d;
      far = i;
    }
  }
  const head = rdp(points.slice(0, far + 1), tolerance);
  const tail = rdp([...points.slice(far), start], tolerance);
  return [...head.slice(0, -1), ...tail];
}

async function main() {
  const meta = await sharp(SOURCE).metadata();
  const sourceWidth = meta.width ?? 174;

  // Trace at 4x with a light blur: a 174px raster gives marching squares a staircase on every
  // diagonal, and the extrusion turns each step into a visible shelf.
  const { data: pixels, info } = await sharp(SOURCE)
    .ensureAlpha()
    .resize({ width: sourceWidth * UPSCALE, kernel: "lanczos3" })
    .blur(BLUR_SIGMA)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Values are the alpha channel as 0..1. Marching squares wants a dense array.
  const values = new Float64Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    values[i] = pixels[i * channels + 3] / 255;
  }

  const scale = 1 / Math.max(width, height);
  const polygons = contours()
    .size([width, height])
    .thresholds([THRESHOLD])(values)[0].coordinates;

  const rings = polygons.map((polygon) =>
    polygon.map((ring) =>
      simplifyRing(
        ring.map(([x, y]) => [
          // Centre on the mark and flip Y: screen space grows downwards, 3D space grows upwards.
          Number(((x - width / 2) * scale).toFixed(5)),
          Number((-(y - height / 2) * scale).toFixed(5)),
        ]),
        SIMPLIFY,
      ),
    ),
  );

  const totalPoints = rings.reduce((sum, polygon) => sum + polygon.reduce((n, ring) => n + ring.length, 0), 0);
  const holes = rings.reduce((sum, polygon) => sum + polygon.length - 1, 0);

  const file = `/**
 * AN monogram as vector contours — GENERATED by scripts/build-an-shape.mjs.
 *
 * Source of the silhouette: the owner's own mark, \`public/brand/an-mark.webp\` (${width}x${height},
 * alpha channel). Marching squares at alpha ${THRESHOLD}; each polygon is [outerRing, ...holes].
 * Units are normalised so the longest side is 1 and the mark is centred on the origin, which lets the
 * 3D scene size it in world units without depending on the raster's pixel size.
 *
 * Do not hand-edit: re-run \`node scripts/build-an-shape.mjs\` after the mark file changes.
 */
export type Ring = readonly (readonly [number, number])[];
export type AnPolygon = readonly Ring[];

export const AN_SHAPE_ASPECT = ${(width / height).toFixed(5)};

export const anShape: readonly AnPolygon[] = ${JSON.stringify(rings)};

/**
 * The same silhouette as one SVG path string (unit box, y down), for the loading curtain and any
 * outline that has to be drawn with stroke-dashoffset rather than rendered as a mesh.
 */
export const anOutlinePath =
  ${JSON.stringify(rings
    .map((polygon) =>
      polygon
        .map((ring) => `M${ring.map(([x, y]) => `${x.toFixed(4)},${(-y).toFixed(4)}`).join("L")}Z`)
        .join(""),
    )
    .join(""))};
`;

  writeFileSync(TARGET, file);
  console.log(
    `traced ${rings.length} polygon(s), ${holes} hole(s), ${totalPoints} points → ${TARGET.replace(process.cwd() + "/", "")}`,
  );
}

main();
