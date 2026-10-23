/**
 * Offscreen reference render of the Liquid Signal.
 *
 * Why this exists: the field is a WebGL shader, and a shader cannot be reviewed in a diff. This
 * script replays the same maths — lattice, radial jitter, wobble, depth, rim weighting, dot size,
 * palette, fragment falloff — on the CPU and writes a PNG, so the look can be checked and the point
 * budget tuned without a GPU. It is a *reference*, not a screenshot: it is the model, the browser is
 * the implementation.
 *
 *   npx tsx scripts/liquid-signal-reference.ts /tmp/field.png [points] [seconds]
 *
 * No dependencies: the PNG is written by hand (truecolour, filter 0, zlib from node:zlib).
 */

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

import {
  CAMERA_DISTANCE,
  QUAD_STRIDE,
  frameState,
  sphereQuads,
} from "../src/components/effects/liquid-signal/geometry";

const SIZE = 600;
const BACKGROUND: [number, number, number] = [10, 10, 14]; // #0A0A0E
const OPACITY = 0.92;

const [out = "/tmp/liquid-signal.png", pointsArg = "5600", secondsArg = "2.5"] = process.argv.slice(2);
const count = Number(pointsArg);
const seconds = Number(secondsArg);

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** Same three crossed sine waves as `wobble()` in shaders.ts. */
function wobble(x: number, y: number, z: number, t: number) {
  const a =
    Math.sin(x * 2.1 + t * 0.55) * Math.sin(y * 1.7 - t * 0.4) * Math.sin(z * 2.3 + t * 0.35);
  const b = Math.sin((x + y + z) * 3.1 + t * 0.75);
  const c = Math.sin(y * 4.4 - t * 0.6) * Math.sin(z * 3.6 + t * 0.5);
  return a * 0.55 + b * 0.16 + c * 0.13;
}

function transform(m: Float32Array, x: number, y: number, z: number) {
  return {
    x: m[0]! * x + m[4]! * y + m[8]! * z + m[12]!,
    y: m[1]! * x + m[5]! * y + m[9]! * z + m[13]!,
    z: m[2]! * x + m[6]! * y + m[10]! * z + m[14]!,
    w: m[3]! * x + m[7]! * y + m[11]! * z + m[15]!,
  };
}

const pixels = new Float32Array(SIZE * SIZE * 3);
for (let i = 0; i < SIZE * SIZE; i += 1) {
  pixels[i * 3] = BACKGROUND[0];
  pixels[i * 3 + 1] = BACKGROUND[1];
  pixels[i * 3 + 2] = BACKGROUND[2];
}

const quads = sphereQuads(count);
const uniforms = frameState({ seconds, aspect: 1, canvasHeight: SIZE });

const PURPLE = [0.3, 0.02, 0.98];
const BLUE = [0, 0.529, 1];
const ICY = [0.541, 0.91, 1];

interface Dot {
  x: number;
  y: number;
  radius: number;
  colour: number[];
  alpha: number;
  depth: number;
}

const dots: Dot[] = [];
for (let i = 0; i < count; i += 1) {
  const offset = i * 6 * QUAD_STRIDE;
  const cx = quads[offset] ?? 0;
  const cy = quads[offset + 1] ?? 0;
  const cz = quads[offset + 2] ?? 0;
  const seed = quads[offset + 3] ?? 0;

  const length = Math.hypot(cx, cy, cz) || 1;
  const nx = cx / length;
  const ny = cy / length;
  const nz = cz / length;

  const radius = length * (1 + 0.17 * wobble(nx, ny, nz, seconds));
  const px = nx * radius * uniforms.scale;
  const py = ny * radius * uniforms.scale;
  const pz = nz * radius * uniforms.scale;

  const view = transform(uniforms.view, px, py, pz);
  const clip = transform(uniforms.projection, view.x, view.y, view.z);

  const screenX = ((clip.x / clip.w) * 0.5 + 0.5) * SIZE;
  const screenY = (1 - ((clip.y / clip.w) * 0.5 + 0.5)) * SIZE;

  const depth = Math.min(1, Math.max(0, (-view.z - (CAMERA_DISTANCE - 1.25)) / 2.5));
  const rim = 1 - Math.abs(nz);
  const pixelsPerDot =
    uniforms.pointPixels *
    (0.75 + 0.25 * seed) *
    (0.75 + 0.65 * depth) *
    (0.85 + 0.9 * rim);

  const up = Math.min(1, Math.max(0, py * 0.5 + 0.5));
  const colour = PURPLE.map((value, channel) => {
    const blueMix = mix(value, BLUE[channel]!, smoothstep(0.05, 0.6, up));
    const icyTop = mix(blueMix, ICY[channel]!, smoothstep(0.62, 1, up) * 0.9);
    return mix(icyTop, ICY[channel]!, smoothstep(0.3, 0.95, rim) * 0.35 * depth) * 255;
  });

  const brightness = Math.min(1, Math.max(depth, rim * rim * 1.15));
  const alpha = (0.12 + 0.78 * brightness) * (0.55 + 0.45 * seed) * OPACITY;

  dots.push({ x: screenX, y: screenY, radius: pixelsPerDot / 2, colour, alpha, depth: view.z });
}

// Painter's algorithm: far side first, so near dots win the overlap.
dots.sort((a, b) => a.depth - b.depth);

for (const dot of dots) {
  const reach = Math.ceil(dot.radius) + 1;
  for (let y = Math.floor(dot.y - reach); y <= dot.y + reach; y += 1) {
    if (y < 0 || y >= SIZE) continue;
    for (let x = Math.floor(dot.x - reach); x <= dot.x + reach; x += 1) {
      if (x < 0 || x >= SIZE) continue;
      const distance = Math.hypot((x - dot.x) / dot.radius, (y - dot.y) / dot.radius);
      if (distance > 1) continue;
      // Matches the fragment shader: discard outside the quad, smoothstep(1.0, 0.30, d) inside.
      const coverage = smoothstep(1.0, 0.3, distance) * dot.alpha;
      const index = (y * SIZE + x) * 3;
      for (let channel = 0; channel < 3; channel += 1) {
        const current = pixels[index + channel] ?? 0;
        pixels[index + channel] = current * (1 - coverage) + dot.colour[channel]! * coverage;
      }
    }
  }
}

/* ---------------------------------------------------------------- PNG encoding (no deps) */

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

const header = Buffer.alloc(13);
header.writeUInt32BE(SIZE, 0);
header.writeUInt32BE(SIZE, 4);
header[8] = 8; // bit depth
header[9] = 2; // truecolour
const raw = Buffer.alloc(SIZE * (SIZE * 3 + 1));
for (let y = 0; y < SIZE; y += 1) {
  raw[y * (SIZE * 3 + 1)] = 0; // filter: none
  for (let x = 0; x < SIZE; x += 1) {
    const source = (y * SIZE + x) * 3;
    const target = y * (SIZE * 3 + 1) + 1 + x * 3;
    for (let channel = 0; channel < 3; channel += 1) {
      raw[target + channel] = Math.max(0, Math.min(255, Math.round(pixels[source + channel] ?? 0)));
    }
  }
}

writeFileSync(
  out,
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]),
);

console.log(`wrote ${out}: ${count} points, t=${seconds}s, ${uniforms.pointPixels.toFixed(2)} px dots`);
