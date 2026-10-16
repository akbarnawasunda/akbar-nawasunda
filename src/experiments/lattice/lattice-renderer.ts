import { latticeConfig } from "./lattice-config";
import {
  beatPeriod,
  makeRotation,
  projectPoint,
  surfaceHeight,
  type Projected,
  type Rotation,
} from "./lattice-math";

/**
 * Canvas 2D renderer for the Lattice study. It owns all per-frame work and keeps no React state:
 * the host component calls `resize` when the box changes and `draw` on each animation frame.
 * Buffers are allocated once per grid density and reused every frame.
 */

export interface FrameState {
  /** Simulation time in seconds. */
  time: number;
  /** Current yaw of the surface in radians. */
  yaw: number;
}

export interface LatticeRenderer {
  resize(width: number, height: number, dpr: number): void;
  draw(state: FrameState): void;
}

/** Number of brightness levels; each level has a pre-built CSS colour string. */
const LEVELS = 24;
/** Brightness above which a point is drawn in the accent colour (the beat crest). */
const ACCENT_THRESHOLD = 0.86;

const BONE_RGB = "236, 232, 223";
const ACCENT_RGB = "125, 151, 173";

function buildPalette(): string[] {
  const palette: string[] = [];
  for (let i = 0; i < LEVELS; i++) {
    const v = i / (LEVELS - 1);
    const alpha = (0.08 + 0.92 * Math.pow(v, 1.4)).toFixed(3);
    const rgb = v >= ACCENT_THRESHOLD ? ACCENT_RGB : BONE_RGB;
    palette.push(`rgba(${rgb}, ${alpha})`);
  }
  return palette;
}

export function createLatticeRenderer(canvas: HTMLCanvasElement): LatticeRenderer {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    throw new Error("Canvas 2D context is not available.");
  }

  const palette = buildPalette();
  const period = beatPeriod(latticeConfig.bpm);

  let cssWidth = 0;
  let cssHeight = 0;
  let cols = 0;
  let rows = 0;
  let count = 0;
  // Base grid positions in world space; allocated per density.
  let baseX = new Float32Array(0);
  let baseZ = new Float32Array(0);
  // Per-frame scratch; reused to avoid allocations in the loop.
  const projected: Projected = { x: 0, up: 0, scale: 1 };
  let unitPx = 1; // on-screen pixels per world unit at depth 0
  let centreX = 0;
  let centreY = 0;

  function buildGrid(nextCols: number, nextRows: number) {
    cols = nextCols;
    rows = nextRows;
    count = cols * rows;
    baseX = new Float32Array(count);
    baseZ = new Float32Array(count);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        baseX[i] = -1 + (2 * col) / (cols - 1);
        baseZ[i] = -1 + (2 * row) / (rows - 1);
      }
    }
  }

  function resize(width: number, height: number, dpr: number) {
    cssWidth = width;
    cssHeight = height;
    const pixelRatio = Math.min(dpr, latticeConfig.maxDpr);
    canvas.width = Math.max(1, Math.round(width * pixelRatio));
    canvas.height = Math.max(1, Math.round(height * pixelRatio));
    ctx!.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const density =
      width < latticeConfig.mobileBreakpoint
        ? latticeConfig.density.mobile
        : latticeConfig.density.desktop;
    if (density.cols !== cols || density.rows !== rows) {
      buildGrid(density.cols, density.rows);
    }

    // Fit the plane to the box: limited by width for wide screens, by height for tall ones.
    unitPx = Math.min(width * 0.42, height * 0.46);
    centreX = width / 2;
    // Sit the surface slightly above centre so the typography has room below it.
    centreY = height * 0.44;
  }

  const rotation: Rotation = makeRotation(0, latticeConfig.tilt);

  function draw({ time, yaw }: FrameState) {
    if (cssWidth === 0) return;

    ctx!.clearRect(0, 0, cssWidth, cssHeight);

    const pulseAge = time % period;
    rotation.cosYaw = Math.cos(yaw);
    rotation.sinYaw = Math.sin(yaw);

    const { near, far } = latticeConfig.pointSize;
    const cam = latticeConfig.cameraDistance;

    for (let i = 0; i < count; i++) {
      const x = baseX[i]!;
      const z = baseZ[i]!;
      const h = surfaceHeight(x, z, time, pulseAge);

      projectPoint(x, h, z, rotation, cam, projected);

      const sx = centreX + projected.x * unitPx * projected.scale;
      const sy = centreY - projected.up * unitPx * projected.scale;

      // Brightness: higher points glow, distant points fade.
      const crest = Math.min(1, Math.max(-1, h / 0.25));
      const brightness = 0.34 + 0.5 * Math.abs(crest) + 0.7 * Math.max(0, h - 0.06) / 0.14;
      const depthFade = Math.min(1, Math.max(0, (projected.scale - 0.55) / 0.9));
      const v = Math.min(1, Math.max(0, brightness * (0.3 + 0.7 * depthFade)));

      const level = Math.min(LEVELS - 1, Math.floor(v * LEVELS));
      ctx!.fillStyle = palette[level]!;

      const size = far + (near - far) * depthFade;
      ctx!.fillRect(sx - size / 2, sy - size / 2, size, size);
    }
  }

  return { resize, draw };
}
