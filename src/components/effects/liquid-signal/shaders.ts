/**
 * GLSL ES 1.00 shaders for the Liquid Signal.
 *
 * Written against the 1.00 dialect on purpose: a WebGL2 context accepts them, and so does a WebGL1
 * context, which keeps one shader source covering both paths.
 *
 * Each particle is a camera-facing quad, not a `gl.POINTS` sprite. Two reasons, both learned the
 * hard way: `gl_PointSize` is capped differently by every driver (some Android GPUs stop at 1 px),
 * and point rasterisation is the least-tested path in software GL — it crashes outright in the
 * headless SwiftShader used for screenshots and CI. Six vertices per particle cost nothing at these
 * counts and behave the same everywhere.
 *
 * The lighting model is one sentence: *the edge of the form is lit, the inside is not*. A shell of
 * dots whose brightness is driven by the rim and by depth gives a liquid membrane — icy at the top
 * silhouette, signal blue through the body, purple where it falls away at the bottom — instead of
 * the solid glowing ball the art direction forbids.
 */

export const VERTEX_SHADER = /* glsl */ `
attribute vec3 aCentre;  // near-unit sphere position (carries a small radial jitter)
attribute float aSeed;   // 0..1 per point: varies size and opacity
attribute vec2 aCorner;  // -1..1 quad corner, screen-aligned in view space

uniform mat4 uProjection;
uniform mat4 uView;
uniform float uTime;
uniform float uScale;
uniform float uPointPixels;    // base dot diameter, device pixels
uniform float uTanHalfFov;
uniform float uCanvasHeight;   // device pixels
uniform float uCameraDistance; // camera distance from the centre of the form

varying vec3 vColor;
varying float vAlpha;
varying vec2 vCorner;

/**
 * Surface displacement. Crossed sine waves, not simplex noise: a slow organic swell at a fraction of
 * the ALU cost, which matters on the phones this has to run on.
 */
float wobble(vec3 n, float t) {
  float a = sin(n.x * 2.1 + t * 0.55) * sin(n.y * 1.7 - t * 0.40) * sin(n.z * 2.3 + t * 0.35);
  float b = sin((n.x + n.y + n.z) * 3.1 + t * 0.75);
  float c = sin(n.y * 4.4 - t * 0.6) * sin(n.z * 3.6 + t * 0.5);
  return a * 0.55 + b * 0.16 + c * 0.13;
}

void main() {
  vec3 n = normalize(aCentre);
  // length(aCentre) keeps the per-point radial jitter that breaks up the lattice.
  float radius = length(aCentre) * (1.0 + 0.17 * wobble(n, uTime));
  vec3 position = n * radius * uScale;

  vec4 mv = uView * vec4(position, 1.0);

  // 0 = far side of the shell, 1 = nearest. The near surface is brighter and its dots are larger,
  // which is what makes the field read as a volume rather than as a disc of equal dots.
  float depth = clamp((-mv.z - (uCameraDistance - 1.25)) / 2.5, 0.0, 1.0);

  // Silhouette weight: points whose normal is perpendicular to the view sit on the rim.
  float rim = 1.0 - abs(n.z);

  float pixels = uPointPixels
    * (0.75 + 0.25 * aSeed)
    * (0.75 + 0.65 * depth)
    * (0.85 + 0.90 * rim);

  // View space is screen-aligned, so the quad is offset in xy and never needs a camera basis.
  // Converting the pixel diameter to view units needs the frustum height at this depth.
  float halfSize = pixels * 0.5 * (-mv.z) * uTanHalfFov / max(1.0, uCanvasHeight);
  mv.xy += aCorner * halfSize;

  gl_Position = uProjection * mv;

  // Palette from the art direction: purple in shadow, signal blue through the body, icy at the
  // lit edge. Fixed to the form (height + rim), never to screen position.
  vec3 purple = vec3(0.300, 0.020, 0.980);
  vec3 blue = vec3(0.000, 0.529, 1.000);
  vec3 icy = vec3(0.541, 0.910, 1.000);

  float up = clamp(position.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 colour = mix(purple, blue, smoothstep(0.05, 0.60, up));
  colour = mix(colour, icy, smoothstep(0.62, 1.0, up) * 0.90);
  colour = mix(colour, icy, smoothstep(0.30, 0.95, rim) * 0.35 * depth);

  float brightness = min(1.0, max(depth, rim * rim * 1.15));

  vColor = colour;
  vCorner = aCorner;
  vAlpha = (0.12 + 0.78 * brightness) * (0.55 + 0.45 * aSeed);
}
`;

export const FRAGMENT_SHADER = /* glsl */ `
precision mediump float;

varying vec3 vColor;
varying float vAlpha;
varying vec2 vCorner;

uniform float uOpacity;

void main() {
  // Round, softly edged dot: a hard square quad would read as pixels, not particles.
  float distanceFromCentre = length(vCorner);
  if (distanceFromCentre > 1.0) discard;
  float alpha = smoothstep(1.0, 0.30, distanceFromCentre);
  gl_FragColor = vec4(vColor, alpha * vAlpha * uOpacity);
}
`;
