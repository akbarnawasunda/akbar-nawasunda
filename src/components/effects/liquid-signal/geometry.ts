/**
 * Pure geometry and maths for the Liquid Signal.
 *
 * Nothing here touches WebGL, the DOM or React, so every rule that decides *what* is drawn can be
 * unit-tested: how many points a device gets, where they sit on the sphere, and the matrices the
 * vertex shader expects.
 */

/** Deterministic PRNG (mulberry32). Same seed → same field, so screenshots and tests are stable. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DeviceProfile {
  /** CSS pixel width of the element the field is drawn into. */
  width: number;
  /** devicePixelRatio, before capping. */
  dpr: number;
  /** navigator.hardwareConcurrency, when the browser exposes it. */
  cores?: number;
  /** Coarse pointer = touch-first device. */
  coarsePointer?: boolean;
}

/**
 * Point count for the field.
 *
 * The point cloud is the whole visual, so the budget is about fill rate, not geometry: every dot is
 * a soft quad, and a phone redrawing tens of thousands of them at 2x DPR drops frames long before
 * the GPU runs out of vertices. Counts are tuned against an offscreen reference render at 600 px:
 * below ~2,500 points the form breaks up into dust, above ~6,000 it stops reading as dots.
 * Small screens also show the field at a fraction of its 600 px size, so they need fewer points.
 */
export function pointBudget({ width, dpr, cores = 8, coarsePointer = false }: DeviceProfile): number {
  const small = width < 720 || coarsePointer;
  const weak = cores <= 4 || dpr >= 3;
  if (small && weak) return 2600;
  if (small) return 3400;
  if (weak) return 4400;
  return 5600;
}

/** devicePixelRatio is capped at 2: a 3x buffer triples the fill cost for no visible gain on dots. */
export function cappedDpr(dpr: number, max = 2): number {
  if (!Number.isFinite(dpr) || dpr <= 0) return 1;
  return Math.min(dpr, max);
}

/**
 * Whether the animated field should run at all.
 *
 * Anything that is not an explicit "yes" keeps the static field: the inline SVG is the default, and
 * motion is the enhancement. `prefers-reduced-motion: reduce` is a user instruction, not a hint.
 */
export function shouldAnimate(options: {
  reducedMotion: boolean;
  hasWebGL: boolean;
  documentHidden?: boolean;
}): boolean {
  if (options.reducedMotion) return false;
  if (!options.hasWebGL) return false;
  if (options.documentHidden) return false;
  return true;
}

/**
 * Evenly distributed points on a unit sphere (Fibonacci lattice).
 *
 * A latitude/longitude loop would clump at the poles; on a dot field that reads as a defect. The
 * golden-angle spiral gives near-uniform spacing at any count.
 *
 * Layout per point: x, y, z, seed (0..1) — the seed varies size and opacity so the cloud is not a
 * uniform screen of identical dots.
 */
export function fibonacciSphere(count: number, seed = 20261): Float32Array {
  if (!Number.isFinite(count) || count <= 0) return new Float32Array(0);
  const positions = new Float32Array(count * 4);
  const random = seededRandom(seed);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    positions[i * 4] = Math.cos(theta) * radius;
    positions[i * 4 + 1] = y;
    positions[i * 4 + 2] = Math.sin(theta) * radius;
    positions[i * 4 + 3] = random();
  }
  return positions;
}

/**
 * Corner offsets for the two triangles of a screen-facing quad, in [-1, 1].
 *
 * Each particle is drawn as this quad rather than as a `gl.POINTS` sprite: point size is capped
 * differently by every driver, and point rasterisation is the least reliable path on software GL.
 */
export const QUAD_CORNERS: readonly number[] = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];

/** Floats per vertex in the expanded quad buffer: centre xyz, seed, corner xy. */
export const QUAD_STRIDE = 6;

/** How far each point may sit off the exact sphere, as a fraction of the radius. */
export const RADIAL_JITTER = 0.055;

/**
 * Expands `count` sphere points into `count * 6` quad vertices for the vertex shader.
 *
 * Six vertices per particle instead of instancing keeps the renderer on one code path that works on
 * WebGL1 and WebGL2 alike (no `ANGLE_instanced_arrays`, no WebGL2-only API), and the buffer is built
 * once per resize, so the cost is a few milliseconds at worst.
 *
 * Layout per vertex: x, y, z, seed, cornerX, cornerY.
 */
export function sphereQuads(count: number, seed = 20261): Float32Array {
  if (!Number.isFinite(count) || count <= 0) return new Float32Array(0);
  const points = fibonacciSphere(count, seed);
  // A second, independent stream jitters the radius per point. Without it the golden-angle lattice
  // shows as concentric rings on screen; with it the shell reads as an organic surface.
  const random = seededRandom(97531);
  const vertices = count * 6;
  const out = new Float32Array(vertices * QUAD_STRIDE);
  for (let i = 0; i < count; i += 1) {
    const jitter = 1 + (random() - 0.5) * RADIAL_JITTER;
    const x = (points[i * 4] ?? 0) * jitter;
    const y = (points[i * 4 + 1] ?? 0) * jitter;
    const z = (points[i * 4 + 2] ?? 0) * jitter;
    const pointSeed = points[i * 4 + 3] ?? 0;
    for (let corner = 0; corner < 6; corner += 1) {
      const offset = (i * 6 + corner) * QUAD_STRIDE;
      out[offset] = x;
      out[offset + 1] = y;
      out[offset + 2] = z;
      out[offset + 3] = pointSeed;
      out[offset + 4] = QUAD_CORNERS[corner * 2] ?? 0;
      out[offset + 5] = QUAD_CORNERS[corner * 2 + 1] ?? 0;
    }
  }
  return out;
}

/** Vertical field of view of the field, in radians. Shared by the shader and the renderer. */
export const FIELD_OF_VIEW = 0.82;

/** Camera distance from the centre of the form, in the same units as the sphere radius. */
export const CAMERA_DISTANCE = 3.15;

/** Column-major 4x4 perspective projection (matches what WebGL's uniformMatrix4fv expects). */
export function perspective(fovY: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

export function rotationY(radians: number): Float32Array {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  const out = new Float32Array(16);
  out[0] = c;
  out[2] = -s;
  out[5] = 1;
  out[8] = s;
  out[10] = c;
  out[15] = 1;
  return out;
}

export function rotationX(radians: number): Float32Array {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  const out = new Float32Array(16);
  out[0] = 1;
  out[5] = c;
  out[6] = s;
  out[9] = -s;
  out[10] = c;
  out[15] = 1;
  return out;
}

export function translation(x: number, y: number, z: number): Float32Array {
  const out = new Float32Array(16);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[12] = x;
  out[13] = y;
  out[14] = z;
  out[15] = 1;
  return out;
}

/** a × b, both column-major. */
export function multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) {
        sum += a[k * 4 + row]! * b[col * 4 + k]!;
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

/**
 * Dot diameter per 600 px of buffer height, before the floor.
 *
 * 3.78 px at a 600 px buffer + 0.7 px floor = 4.48 px base, which the shader then modulates by
 * depth, rim and seed (roughly 0.7x–2.0x). Tuned against the offscreen reference render: smaller
 * and the field turns to dust, larger and it closes into a solid ball.
 */
const POINT_PIXELS_PER_UNIT = 3.78;
const POINT_PIXELS_FLOOR = 0.7;

/**
 * Everything the renderer feeds the shader for one frame, as plain numbers.
 *
 * Kept out of the WebGL file so the values that decide how the field *looks* — dot size in device
 * pixels, camera distance, breathing scale — can be asserted in a test without a GPU.
 */
export function frameState(options: {
  seconds: number;
  aspect: number;
  canvasHeight: number;
}): { projection: Float32Array; view: Float32Array; scale: number; pointPixels: number } {
  const { seconds, aspect, canvasHeight } = options;
  return {
    projection: perspective(FIELD_OF_VIEW, aspect, 0.1, 20),
    view: signalViewMatrix(seconds),
    scale: breathScale(seconds),
    pointPixels: (canvasHeight / 600) * POINT_PIXELS_PER_UNIT + POINT_PIXELS_FLOOR,
  };
}

/**
 * Camera transform for the field: a slow yaw (0 → 5°), a fixed slight upward tilt, pushed back so
 * the blob fills the frame without touching the edges.
 */
export function signalViewMatrix(seconds: number): Float32Array {
  const yaw = (seconds * Math.PI * 5) / 180 / 20; // 5° over 20 s
  const tilt = (-8 * Math.PI) / 180;
  return multiply(translation(0, 0, -CAMERA_DISTANCE), multiply(rotationX(tilt), rotationY(yaw)));
}

/** Breathing curve: 1 → 1.03 over 6 s (3D_ART_DIRECTION.md, hero idle). */
export function breathScale(seconds: number): number {
  return 1 + 0.015 * (1 - Math.cos((seconds * Math.PI * 2) / 6));
}
