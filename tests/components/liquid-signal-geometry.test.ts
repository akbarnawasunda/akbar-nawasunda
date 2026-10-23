import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  breathScale,
  cappedDpr,
  fibonacciSphere,
  frameState,
  multiply,
  perspective,
  pointBudget,
  rotationX,
  rotationY,
  QUAD_CORNERS,
  QUAD_STRIDE,
  RADIAL_JITTER,
  seededRandom,
  shouldAnimate,
  signalViewMatrix,
  sphereQuads,
  translation,
} from "../../src/components/effects/liquid-signal/geometry";

/**
 * Phase 7. The renderer itself needs a GPU, but every rule that decides *what* it draws is pure:
 * point count, point placement, the camera and the breathing curve. Those are the parts that break
 * silently on a real device, so they are pinned here.
 */

function close(actual: number, expected: number, tolerance = 4) {
  assert.ok(
    Math.abs(actual - expected) < 10 ** -tolerance,
    `expected ${actual} to be within 1e-${tolerance} of ${expected}`,
  );
}

describe("seededRandom", () => {
  it("is deterministic for a seed and stays in [0,1)", () => {
    const a = seededRandom(20261);
    const b = seededRandom(20261);
    const first = [a(), a(), a(), a(), a()];
    const second = [b(), b(), b(), b(), b()];
    assert.deepEqual(first, second);
    for (const value of first) {
      assert.ok(value >= 0 && value < 1);
    }
  });

  it("produces a different stream for a different seed", () => {
    assert.notEqual(seededRandom(1)(), seededRandom(2)());
  });
});

describe("pointBudget", () => {
  const allowed = [2600, 3400, 4400, 5600];

  it("always returns one of the four documented budgets", () => {
    for (const cores of [1, 2, 4, 8, 16]) {
      for (const coarsePointer of [true, false]) {
        for (const dpr of [1, 1.5, 2, 3]) {
          const count = pointBudget({ width: 600, dpr, cores, coarsePointer });
          assert.ok(allowed.includes(count), `${count} is not a documented budget`);
        }
      }
    }
  });

  it("gives weak touch devices the smallest field", () => {
    assert.equal(pointBudget({ width: 600, dpr: 1, cores: 2, coarsePointer: true }), 2600);
    assert.equal(pointBudget({ width: 600, dpr: 2, cores: 3, coarsePointer: true }), 2600);
  });

  it("gives a desktop machine the largest field", () => {
    assert.equal(pointBudget({ width: 900, dpr: 1.25, cores: 16, coarsePointer: false }), 5600);
  });

  it("never returns more points for a coarse pointer than a fine one", () => {
    const fine = pointBudget({ width: 600, dpr: 2, cores: 8, coarsePointer: false });
    const coarse = pointBudget({ width: 600, dpr: 2, cores: 8, coarsePointer: true });
    assert.ok(coarse <= fine);
  });

  it("shrinks the field on a very small stage", () => {
    const big = pointBudget({ width: 900, dpr: 1, cores: 8, coarsePointer: false });
    const small = pointBudget({ width: 220, dpr: 1, cores: 8, coarsePointer: false });
    assert.ok(small < big);
  });
});

describe("cappedDpr", () => {
  it("caps at 2x to keep the pixel count sane on high-density phones", () => {
    assert.equal(cappedDpr(1), 1);
    assert.equal(cappedDpr(1.5), 1.5);
    assert.equal(cappedDpr(2), 2);
    assert.equal(cappedDpr(3), 2);
    assert.equal(cappedDpr(0), 1);
    assert.equal(cappedDpr(Number.NaN), 1);
  });
});

describe("shouldAnimate", () => {
  it("animates only when motion is allowed, WebGL exists and the document is visible", () => {
    assert.equal(
      shouldAnimate({ reducedMotion: false, hasWebGL: true, documentHidden: false }),
      true,
    );
    assert.equal(
      shouldAnimate({ reducedMotion: true, hasWebGL: true, documentHidden: false }),
      false,
    );
    assert.equal(
      shouldAnimate({ reducedMotion: false, hasWebGL: false, documentHidden: false }),
      false,
    );
    assert.equal(shouldAnimate({ reducedMotion: false, hasWebGL: true, documentHidden: true }), false);
  });
});

describe("fibonacciSphere", () => {
  const count = 500;
  const points = fibonacciSphere(count);

  it("returns xyz + seed quads", () => {
    assert.ok(points instanceof Float32Array);
    assert.equal(points.length, count * 4);
  });

  it("places every point on the unit sphere", () => {
    for (let i = 0; i < count; i += 1) {
      const radius = Math.hypot(points[i * 4]!, points[i * 4 + 1]!, points[i * 4 + 2]!);
      close(radius, 1, 4);
    }
  });

  it("keeps the lattice exact — jitter is applied when building quads, not here", () => {
    assert.equal(points.length, count * 4);
  });

  it("spreads evenly: no empty cap, no clumped pole", () => {
    let north = 0;
    let south = 0;
    for (let i = 0; i < count; i += 1) {
      const y = points[i * 4 + 1]!;
      if (y > 0.8) north += 1;
      if (y < -0.8) south += 1;
    }
    // A uniform sphere puts ~10% of its area in each 0.8 cap; a pole-clumped lattice overshoots.
    for (const share of [north, south]) {
      assert.ok(share > count * 0.05 && share < count * 0.16, `cap share was ${share}/${count}`);
    }
  });

  it("is stable across calls so the field does not reshuffle on resize", () => {
    assert.deepEqual(fibonacciSphere(count), points);
  });

  it("returns an empty buffer for a non-positive count", () => {
    assert.equal(fibonacciSphere(0).length, 0);
    assert.equal(fibonacciSphere(-5).length, 0);
  });
});

describe("sphereQuads", () => {
  const count = 40;
  const quads = sphereQuads(count);

  it("emits six vertices per particle with the documented layout", () => {
    assert.equal(QUAD_CORNERS.length, 12);
    assert.equal(quads.length, count * 6 * QUAD_STRIDE);
  });

  it("keeps every quad inside the thin jittered shell", () => {
    assert.ok(RADIAL_JITTER > 0 && RADIAL_JITTER < 0.1);
    for (let vertex = 0; vertex < count * 6; vertex += 1) {
      const offset = vertex * QUAD_STRIDE;
      const radius = Math.hypot(quads[offset]!, quads[offset + 1]!, quads[offset + 2]!);
      close(radius, 1, 0);
      assert.ok(Math.abs(radius - 1) <= RADIAL_JITTER / 2 + 1e-6, `radius ${radius}`);
    }
  });

  it("actually uses the jitter instead of leaving a perfect sphere", () => {
    const radii = new Set<string>();
    for (let particle = 0; particle < count; particle += 1) {
      const offset = particle * 6 * QUAD_STRIDE;
      radii.add(Math.hypot(quads[offset]!, quads[offset + 1]!, quads[offset + 2]!).toFixed(4));
    }
    assert.ok(radii.size > count * 0.5, `only ${radii.size} distinct radii`);
  });

  it("covers all four corners of the quad exactly once per triangle pair", () => {
    for (let particle = 0; particle < count; particle += 1) {
      const seen = new Set<string>();
      for (let corner = 0; corner < 6; corner += 1) {
        const offset = (particle * 6 + corner) * QUAD_STRIDE;
        const x = quads[offset + 4]!;
        const y = quads[offset + 5]!;
        assert.ok(Math.abs(x) === 1 && Math.abs(y) === 1, `corner ${x},${y}`);
        seen.add(`${x},${y}`);
      }
      // Two triangles covering the same square = two copies of each corner.
      assert.equal(seen.size, 4);
    }
  });

  it("gives every vertex of one particle the same centre and seed", () => {
    for (let particle = 0; particle < count; particle += 1) {
      const base = particle * 6 * QUAD_STRIDE;
      for (let corner = 1; corner < 6; corner += 1) {
        const offset = base + corner * QUAD_STRIDE;
        assert.equal(quads[offset], quads[base]);
        assert.equal(quads[offset + 1], quads[base + 1]);
        assert.equal(quads[offset + 2], quads[base + 2]);
        assert.equal(quads[offset + 3], quads[base + 3]);
      }
    }
  });

  it("is stable and empty for a non-positive count", () => {
    assert.deepEqual(sphereQuads(count), quads);
    assert.equal(sphereQuads(0).length, 0);
    assert.equal(sphereQuads(-1).length, 0);
  });

  it("stays well inside a mobile GPU buffer for the largest budget", () => {
    const largest = sphereQuads(5600);
    assert.equal(largest.length, 5600 * 6 * QUAD_STRIDE);
    // ~0.8 MB of vertex data, uploaded once per resize; well under a phone's buffer budget.
    assert.ok(largest.byteLength < 1024 * 1024);
  });
});

describe("matrix helpers", () => {
  const identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

  it("multiplying by identity is a no-op", () => {
    const m = perspective(0.82, 1.5, 0.1, 20);
    const result = multiply(identity, m);
    result.forEach((value, index) => close(value, m[index]!, 5));
  });

  it("keeps column-major order: translation lands in the last column", () => {
    const t = translation(1, 2, -3);
    assert.equal(t[12], 1);
    assert.equal(t[13], 2);
    assert.equal(t[14], -3);
    assert.equal(t[15], 1);
  });

  it("rotation matrices stay orthonormal", () => {
    for (const m of [rotationX(0.4), rotationY(-1.1)]) {
      const col0 = [m[0]!, m[1]!, m[2]!];
      const col1 = [m[4]!, m[5]!, m[6]!];
      close(col0[0]! * col1[0]! + col0[1]! * col1[1]! + col0[2]! * col1[2]!, 0, 6);
      close(Math.hypot(...col0), 1, 6);
      close(Math.hypot(...col1), 1, 6);
    }
  });

  it("perspective maps the near plane to -1 and the far plane to +1", () => {
    const near = 0.1;
    const far = 20;
    const m = perspective(0.82, 1.5, near, far);
    const clipZ = (z: number) => (m[10]! * z + m[14]!) / (m[11]! * z + m[15]!);
    close(clipZ(-near), -1, 5);
    close(clipZ(-far), 1, 5);
  });
});

describe("signalViewMatrix", () => {
  it("is a 4x4 matrix and does not loop within a single breath", () => {
    const start = signalViewMatrix(0);
    const quarter = signalViewMatrix(5);
    assert.equal(start.length, 16);
    assert.ok(quarter.some((value, index) => Math.abs(value - start[index]!) > 1e-4));
  });

  it("returns to the start after one full yaw revolution (1440 s at 5deg per 20 s)", () => {
    const start = signalViewMatrix(0);
    signalViewMatrix(1440).forEach((value, index) => close(value, start[index]!, 4));
  });

  it("moves the view less than 10 degrees across one second", () => {
    const apply = (m: Float32Array) => [
      m[8]! + m[12]!,
      m[9]! + m[13]!,
      m[10]! + m[14]!,
    ];
    const a = apply(signalViewMatrix(0));
    const b = apply(signalViewMatrix(1));
    const dot =
      (a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!) / (Math.hypot(...a) * Math.hypot(...b));
    const degrees = (Math.acos(Math.min(1, dot)) * 180) / Math.PI;
    assert.ok(degrees < 10, `view moved ${degrees.toFixed(2)} degrees in one second`);
  });
});

describe("frameState", () => {
  it("scales the dot diameter with the backing buffer, not with the CSS box", () => {
    const at600 = frameState({ seconds: 0, aspect: 1, canvasHeight: 600 });
    const at1200 = frameState({ seconds: 0, aspect: 1, canvasHeight: 1200 });
    // 600 px tall: 3.78 + 0.7 = 4.48; 2x buffer: 7.56 + 0.7 = 8.26.
    close(at600.pointPixels, 4.48, 6);
    close(at1200.pointPixels, 8.26, 6);
    // After the shader's depth/rim/seed factors this stays in the 2-9 px band the brief asks for.
    assert.ok(at600.pointPixels * 0.7 > 2 && at600.pointPixels * 2 < 10);
  });

  it("breathes and carries a projection that matches the aspect ratio", () => {
    const wide = frameState({ seconds: 3, aspect: 2, canvasHeight: 600 });
    const square = frameState({ seconds: 3, aspect: 1, canvasHeight: 600 });
    close(wide.scale, 1.03, 3);
    close(wide.view[14]!, square.view[14]!, 6);
    // x scale is 1/aspect of the y scale, so a wider canvas narrows the frustum horizontally.
    close(wide.projection[0]!, square.projection[0]! / 2, 6);
  });
});

describe("breathScale", () => {
  it("breathes 1 → 1.03 over six seconds", () => {
    close(breathScale(0), 1, 6);
    close(breathScale(3), 1.03, 3);
    close(breathScale(6), 1, 6);
  });

  it("never leaves the documented band", () => {
    for (let t = 0; t < 30; t += 0.25) {
      const scale = breathScale(t);
      assert.ok(scale >= 1 - 1e-9 && scale <= 1.03 + 1e-9, `breathScale(${t}) = ${scale}`);
    }
  });
});
