/**
 * Tunable parameters for the Lattice study. Kept in one place so the look can be iterated
 * without touching the rendering or math code.
 */
export const latticeConfig = {
  /** Tempo of the implied pulse. The surface pulses once per beat. */
  bpm: 124,
  /** Point-grid density by viewport class. Mobile uses fewer points to save CPU/GPU work. */
  density: {
    desktop: { cols: 60, rows: 38 },
    mobile: { cols: 34, rows: 22 },
  },
  /** Viewport width (CSS px) below which the mobile density is used. */
  mobileBreakpoint: 720,
  /** Upper bound on device pixel ratio for the canvas backing store. */
  maxDpr: 2,
  /** Camera: viewing angle of the plane (radians, ~0 = edge-on, π/2 = top-down). */
  tilt: 1.0,
  /** Camera distance in world units. Lower = stronger perspective. */
  cameraDistance: 2.4,
  /** Amount the pointer can yaw the surface (radians, each side). */
  maxYaw: 0.5,
  /** Maximum simulation step (seconds). Prevents jumps after the tab was hidden. */
  maxStep: 1 / 20,
  /** Point size range in CSS px at nearest and farthest depth. */
  pointSize: { near: 2.2, far: 0.8 },
} as const;
