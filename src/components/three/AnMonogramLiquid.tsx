"use client";

/**
 * The liquid AN — round 33: a transparent sheet of mercury, not a block of metal.
 *
 * Round 31 built the monogram out of `ExtrudeGeometry` under a studio environment. It read as a
 * machined badge dropped onto the page: opaque, hard, and always in front of whatever the band was
 * saying. Round 33 asks for the opposite — the mark should behave like mercury spilled on glass. It
 * melts, it ripples, it never becomes a solid object, and **outside the logo it is transparent**, so
 * the page underneath stays visible through it.
 *
 * So the geometry is gone. What is left is one `<PlaneGeometry>` filling the band with a custom
 * fragment shader:
 *
 * - the AN mark (`/brand/an-mark.webp`, the same file the header and the footer use) is `uTexture`;
 * - its UVs are pushed around by a two-octave simplex field plus a pointer ripple, so the silhouette
 *   itself melts and the surface reacts to the hand;
 * - the colour is a chrome ramp (steel → white) crossed with the one chromatic value on this site,
 *   `--color-signal-blue` (#0087FF), so the highlights read as neon, not as studio steel;
 * - `alpha` comes from the texture's own alpha, so outside the strokes the fragment is literally
 *   zero: nothing covers the copy, and `gl.setClearAlpha(0)` keeps the band behind it visible.
 *
 * Contract compliance:
 * - the only module that imports three / fiber, loaded through `next/dynamic(ssr:false)` once the
 *   band approaches — never on the critical path;
 * - it mounts on phones as well as desktops (DPR capped at 1.5), with `onPointerMove` on the band;
 * - `frameloop` parks off screen, so a band that is not visible costs zero frames;
 * - no rAF loop of our own: the shader's own frame eases the pointer uniform;
 * - reduced motion and a missing WebGL context never mount it (see AnMonogram.tsx).
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

/** The mark, as a texture. Loaded through fiber's loader cache, so a remount is free. */
const MARK_URL = "/brand/an-mark.webp";

/* The plane is cut to the mark's own ratio (174 × 112) with a little bleed on each side, because
   the melt runs past the strokes. */
const PLANE_WIDTH = 4.6;
const PLANE_HEIGHT = 3.05;

/** What the band writes and the shader reads. One object, mutated in place, no React state. */
interface PointerState {
  x: number;
  y: number;
  hover: number;
}

const SIMPLEX = /* glsl */ `
vec3 mod289v3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289v4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289v4(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise3(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289v3(i);
  vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHover;

varying vec2 vUv;

${SIMPLEX}

void main() {
  vec2 centred = vUv - 0.5;

  /* Two octaves at different speeds: the slow one sags the whole mark, the fast one breaks the
     edges into droplets. Time is the third dimension, so the field drifts instead of cycling. */
  vec3 field = vec3(centred * 2.6, uTime * 0.16);
  float slow = snoise3(field);
  float fast = snoise3(field * 2.9 + vec3(11.3, 4.7, -uTime * 0.1));

  vec2 flow = vec2(slow, fast) * 0.048;

  /* The pointer: a decaying ring travelling away from the hand along the radial direction, so
     dragging across the band pushes a wave through the mercury. */
  vec2 toPointer = vUv - uMouse;
  toPointer.x *= 1.25;
  float dist = length(toPointer);
  float ripple = sin(dist * 24.0 - uTime * 5.0) * exp(-dist * 5.0) * 0.075 * uHover;
  /* normalize() on a vector of length ~0 is the classic NaN in a shader: it divides by zero and
     the whole fragment turns into a white or black hole. Clamping the divisor keeps the direction
     finite at the exact centre of the band. */
  vec2 direction = toPointer / max(dist, 0.0005);
  flow += direction * ripple;

  vec2 uv = vUv + flow;

  /* Three taps: the centre carries the colour, the offset samples give a cheap surface normal. */
  vec4 mark = texture2D(uTexture, uv);
  float left = texture2D(uTexture, uv - vec2(0.0035, 0.0)).a;
  float right = texture2D(uTexture, uv + vec2(0.0035, 0.0)).a;
  float up = texture2D(uTexture, uv + vec2(0.0, 0.0055)).a;
  float down = texture2D(uTexture, uv - vec2(0.0, 0.0055)).a;

  float mask = smoothstep(0.015, 0.32, mark.a);

  /* Normals off the alpha gradient: strokes facing the light go white, the rest fall to steel. */
  float slope = ((right - left) * 0.75 + (up - down)) * 2.4;
  float light = clamp(0.52 + slope + slow * 0.22 + fast * 0.12, 0.0, 1.0);

  vec3 steel = vec3(0.56, 0.62, 0.72);
  vec3 chrome = vec3(0.97, 0.99, 1.0);
  vec3 neon = vec3(0.0, 0.529, 1.0);

  vec3 colour = mix(steel, chrome, light);
  /* The blue lives on the steepest faces and in the troughs, the way a neon tube shows up in the
     crease of a chrome object. */
  colour = mix(colour, neon, smoothstep(0.32, 0.95, abs(fast) + max(0.0, -slope)) * 0.55);
  /* A faint halo under the strokes: light bleeding through the water, never a filled panel. */
  colour += neon * pow(max(0.0, 1.0 - length(centred) * 1.35), 3.0) * 0.16;

  /* The point of the round: outside the mark the alpha is zero, so the band's copy and the page
     underneath stay visible. */
  float alpha = mask * (0.82 + 0.18 * light);
  if (alpha < 0.004) discard;

  gl_FragColor = vec4(colour, alpha);
}
`;

function LiquidMark({
  pointer,
  onReady,
}: {
  pointer: RefObject<PointerState>;
  onReady: () => void;
}) {
  const texture = useLoader(THREE.TextureLoader, MARK_URL);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const mouse = useRef(new THREE.Vector2(0.5, 0.5));
  const hover = useRef(0);
  const painted = useRef(0);
  const viewport = useThree((state) => state.viewport);

  /* The shader reads only the texture's alpha (the strokes' coverage), never its colour: the
     chrome and the neon are generated in the fragment stage. That is why the loaded texture needs no
     re-configuration at all — no colour-space rewrite, no filter swap, nothing to keep in sync. */

  /*
   * Round 35 — every uniform starts at a value that is *safe on its own*.
   *
   * A shader that receives `undefined`, a `NaN` from a divide-by-zero in JS, or a zero-length vector
   * does not throw: it renders a black sheet, a white sheet, or nothing at all, and the console stays
   * quiet. So the initial state is the neutral state — pointer in the middle of the band, no hover
   * ripple, time at zero — and every write below is guarded by `Number.isFinite`.
   */
  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uHover: { value: 0 },
    }),
    [texture],
  );

  /* The frame loop reads the uniforms through a ref: writing `uTime` is a mutation of a shader
     uniform, which is what the loop is *for*, but it must not look like a render-time mutation. */
  const uniformsRef = useRef(uniforms);
  useEffect(() => {
    uniformsRef.current = uniforms;
  }, [uniforms]);

  useFrame((state, delta) => {
    const u = uniformsRef.current;
    const mesh = meshRef.current;
    if (!mesh) return;

    /* A tab that was backgrounded for an hour hands back a huge `delta`; clamping to one frame keeps
       the melt from jumping. Time itself wraps: a float uniform that grows for hours loses its
       fractional precision and the noise field starts to stutter. */
    const step = Number.isFinite(delta) ? Math.min(Math.max(delta, 0), 0.05) : 0;
    u.uTime.value = (u.uTime.value + step) % 1000;

    const px = Number.isFinite(pointer.current.x) ? pointer.current.x : 0.5;
    const py = Number.isFinite(pointer.current.y) ? pointer.current.y : 0.5;
    const target = new THREE.Vector2(
      Math.min(1, Math.max(0, px)),
      Math.min(1, Math.max(0, py)),
    );
    mouse.current.lerp(target, 0.075);
    if (!Number.isFinite(mouse.current.x) || !Number.isFinite(mouse.current.y)) mouse.current.set(0.5, 0.5);

    const hoverTarget = Number.isFinite(pointer.current.hover) ? pointer.current.hover : 0;
    hover.current += (hoverTarget - hover.current) * 0.06;
    if (!Number.isFinite(hover.current)) hover.current = 0;

    u.uMouse.value.copy(mouse.current);
    u.uHover.value = hover.current;

    /* A phone holds the band portrait, where the *width* is what runs out first: fit the sheet to
       the smaller of the two axes so the mark never leaves the glass. */
    const fit = Math.min(
      1,
      Math.max(0.4, Math.min(viewport.width / PLANE_WIDTH, viewport.height / PLANE_HEIGHT)),
    );
    mesh.scale.setScalar(fit);
    mesh.rotation.y =
      Math.sin(state.clock.elapsedTime * 0.18) * 0.08 + (mouse.current.x - 0.5) * 0.14;
    mesh.rotation.x =
      Math.cos(state.clock.elapsedTime * 0.14) * 0.04 + (mouse.current.y - 0.5) * 0.1;

    /* Tell the band the mark is genuinely on the glass. One frame is not enough — the first frame of
       a fresh context is often the compile frame — so the second one reports. Until then the baked
       still underneath stays at full strength, which is why a slow texture load never shows a gap. */
    if (painted.current < 2) {
      painted.current += 1;
      if (painted.current === 2) onReady();
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[PLANE_WIDTH, PLANE_HEIGHT, 1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        transparent
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * Watches the GPU. A lost context (driver reset, tab evicted by the OS, too many live contexts) does
 * not throw: the canvas simply goes blank and stays blank. Reporting it lets the band put the baked
 * still back on top, which is the difference between "the logo is a shader" and "the logo is there".
 */
function ContextWatch({ onLost }: { onLost?: () => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const handle = (event: Event) => {
      event.preventDefault();
      onLost?.();
    };
    canvas.addEventListener("webglcontextlost", handle);
    return () => canvas.removeEventListener("webglcontextlost", handle);
  }, [gl, onLost]);
  return null;
}

function webglAvailable(): boolean {
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    return false;
  }
}

const WRAP_STYLE = { position: "absolute", inset: 0 } as const;

interface AnMonogramLiquidProps {
  /** Fires once the mark has actually painted — not when the chunk mounts. */
  onReady?: () => void;
  /** Fires if the GPU drops the context; the baked still takes over again. */
  onLost?: () => void;
}

export default function AnMonogramLiquid({ onReady, onLost }: AnMonogramLiquidProps = {}) {
  const [supported] = useState(() => webglAvailable());
  const [inView, setInView] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef<PointerState>({ x: 0.5, y: 0.5, hover: 0 });

  useEffect(() => {
    if (!supported) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    /* Strict edges, no margin: this gate drives the render loop, not the chunk fetch. Off screen
       the canvas is parked (`frameloop="demand"`), so a band that is not visible draws nothing. */
    const observer = new IntersectionObserver((entries) => setInView(entries[0]?.isIntersecting ?? false), {
      rootMargin: "0px 0px",
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [supported]);

  if (!supported) return null;

  return (
    <div
      ref={wrapRef}
      style={WRAP_STYLE}
      onPointerMove={(event) => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const rect = wrap.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        pointer.current.x = (event.clientX - rect.left) / rect.width;
        pointer.current.y = 1 - (event.clientY - rect.top) / rect.height;
        pointer.current.hover = 1;
      }}
      onPointerLeave={() => {
        pointer.current.hover = 0;
      }}
    >
      <Canvas
        frameloop={inView ? "always" : "demand"}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 4.2], fov: 38 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearAlpha(0);
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          /* A finger dragging across the band ripples the water without trapping the page's
             vertical scroll. */
          touchAction: "pan-y",
        }}
      >
        <LiquidMark pointer={pointer} onReady={() => onReady?.()} />
        <ContextWatch onLost={onLost} />
      </Canvas>
    </div>
  );
}
