/**
 * Pure functions describing the surface. No DOM, no React: safe to reason about and test.
 *
 * World space: the plane lies on x/z in [-1, 1]; y is height.
 * The surface height is a sum of two slow interference waves plus a ring that expands from
 * the centre once per beat.
 */

/** Seconds per beat for a tempo in BPM. */
export function beatPeriod(bpm: number): number {
  return 60 / bpm;
}

/** World-space radius of the beat ring, `age` seconds after the beat. */
export function pulseRadius(age: number): number {
  return age * 1.6;
}

/**
 * Surface height at world position (x, z) at time `t`.
 * `pulseAge` is the time since the most recent beat, in seconds.
 */
export function surfaceHeight(x: number, z: number, t: number, pulseAge: number): number {
  const r = Math.sqrt(x * x + z * z);

  // Two slow standing-wave fields. Their amplitude is kept low so the ring reads as the event.
  const field =
    0.12 * Math.sin(3.2 * x + 0.8 * t) * Math.cos(2.6 * z - 0.5 * t) +
    0.05 * Math.sin(6.5 * r - 2.0 * t);

  // Beat ring: a narrow gaussian band travelling outward, decaying with age.
  const d = r - pulseRadius(pulseAge);
  const envelope = Math.exp(-pulseAge * 3.0);
  const ring = 0.14 * envelope * Math.exp(-(d * d) / (2 * 0.05 * 0.05));

  return field + ring;
}

/** Precomputed camera rotation terms for one frame. */
export interface Rotation {
  cosYaw: number;
  sinYaw: number;
  cosTilt: number;
  sinTilt: number;
}

export function makeRotation(yaw: number, tilt: number): Rotation {
  return {
    cosYaw: Math.cos(yaw),
    sinYaw: Math.sin(yaw),
    cosTilt: Math.cos(tilt),
    sinTilt: Math.sin(tilt),
  };
}

/** Result of projecting one point. Reused across calls to avoid allocations. */
export interface Projected {
  /** Horizontal world offset after yaw (before perspective). */
  x: number;
  /** Vertical world offset after tilt (up is positive, before perspective). */
  up: number;
  /** Perspective factor: 1 at depth 0, larger when closer to the viewer. */
  scale: number;
}

/**
 * Projects a world point through yaw (around the vertical axis), tilt (around the horizontal
 * axis) and a perspective divide. The returned `scale` is 1 at depth 0 and the renderer
 * multiplies it by the on-screen unit size.
 */
export function projectPoint(
  x: number,
  y: number,
  z: number,
  rot: Rotation,
  cameraDistance: number,
  out: Projected,
): Projected {
  // Yaw.
  const x1 = x * rot.cosYaw + z * rot.sinYaw;
  const z1 = -x * rot.sinYaw + z * rot.cosYaw;
  // Tilt: "up" on screen mixes height and depth; "depth" is away from the viewer.
  const up = y * rot.cosTilt + z1 * rot.sinTilt;
  const depth = z1 * rot.cosTilt - y * rot.sinTilt;

  out.x = x1;
  out.up = up;
  out.scale = cameraDistance / (cameraDistance + depth);
  return out;
}
