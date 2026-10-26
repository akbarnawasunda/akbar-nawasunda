"use client";

/**
 * The liquid AN — round 29, owner's absolute spec: a full-screen shader quad, not a 3D object.
 *
 * This file is the lazy split chunk of `AnMonogram.tsx` (the contract's sanctioned surface for the
 * mark): it is the only module that imports three/@react-three/fiber, it is imported dynamically
 * the first time the band approaches the viewport, and it renders nothing at all when WebGL is
 * unavailable — the baked WebP still underneath stays the fallback, exactly as round 20 promised
 * phones and reduced-motion users.
 *
 * What the shader does, per spec:
 * - one orthographic 2×2 plane (drei's `Plane` is this mesh; the dependency is skipped, the quad
 *   is identical and the bundle stays three-only);
 * - the AN mark as `uTexture`, used as an alpha mask — the silhouette is the label's own asset;
 * - simplex noise displacing the sample coordinates so the mark ripples and melts;
 * - `uMouse` + `uStrength`: a decaying radial ripple around the cursor, written from pointer
 *   events against a rect that is read once per mount/resize/scroll-burst — never in the loop;
 * - chrome: #0087FF against black, banded by a second noise field, with a moving specular;
 * - `useFrame` advances `uTime`; the material lives in a ref and every per-frame write goes
 *   through it (the React Compiler treats memoised values as frozen, and it is right to);
 * - the Canvas runs `frameloop="always"` only while the band is in view and `"never"` once it
 *   scrolls away.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const VERTEX = /* glsl */ `
uniform float uTime;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  /* A breath in the vertex stage: half a percent of sway, enough to read as a surface, not as
     geometry moving. */
  pos.x += sin(uv.y * 5.0 + uTime * 0.6) * 0.004;
  pos.y += cos(uv.x * 4.0 + uTime * 0.5) * 0.004;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMouse;
uniform float uStrength;
uniform float uSpread;
varying vec2 vUv;

/* Ashima simplex 2D — the standard public-domain implementation. */
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  /* uSpread is the slice of the quad the mark occupies (its aspect ÷ the band's). */
  vec2 p = vec2((vUv.x - 0.5) * uSpread + 0.5, vUv.y);
  float t = uTime * 0.32;

  float n1 = snoise(p * 2.3 + vec2(t * 0.7, -t * 0.45));
  float n2 = snoise(p * 5.2 - vec2(t * 0.9, t * 0.55));
  /* Melt enough to read as liquid metal, never enough to lose the mark: the silhouette has to
     survive the warp, so the amplitude stays under a sixth of the thinnest stroke. */
  vec2 warp = vec2(n1, n2) * (0.016 + 0.014 * n2);

  /* Cursor ripple: a decaying radial wave, strongest under the hand. */
  vec2 toMouse = vUv - uMouse;
  float d = length(toMouse);
  float ripple = sin(d * 34.0 - uTime * 5.5) * exp(-d * 5.0) * uStrength;
  warp += (toMouse / max(d, 0.0001)) * ripple * 0.028;

  /* The source mark is 174×112 stretched over a 700px band: its bilinear alpha is a wide soft
     ramp, which reads as melt no matter how small the warp is. A tight window re-cuts the edge. */
  float a = texture2D(uTexture, p + warp).a;
  a = smoothstep(0.42, 0.58, a);

  /* Liquid chrome: #0087FF banded against black by a slow second field, plus a travelling
     specular and a blue flare where the ripple is. */
  float band = snoise(vec2((p.x + p.y) * 2.6 + uTime * 0.22, p.y * 3.4 - uTime * 0.18));
  vec3 blue = vec3(0.0, 0.529, 1.0);
  vec3 col = mix(vec3(0.008), blue, smoothstep(-0.3, 0.7, band));
  float spec = pow(max(0.0, sin((p.x + p.y) * 9.0 + uTime * 1.3 + band * 3.0)), 14.0);
  col += vec3(0.55, 0.78, 1.0) * spec * 0.85;
  col += blue * max(ripple, 0.0) * 1.6;

  gl_FragColor = vec4(col, a * 0.96);
  if (gl_FragColor.a < 0.01) discard;
}
`;

const WRAP_STYLE = { position: "absolute", inset: 0 } as const;

function webglAvailable(): boolean {
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    return false;
  }
}

/* The mark is 174×112 — it fits the band's full height and keeps that aspect on screen. */
const MARK_ASPECT = 174 / 112;

/**
 * R3F sizes an orthographic frustum in pixels, which would make a 2×2 quad a two-pixel speck, and
 * it re-derives that frustum on resize. The shader thinks in NDC — the quad is the whole band, the
 * mark is a slice of u — so the frame loop re-pins the frustum to [-1, 1]² whenever anything moves
 * it: four comparisons per frame, resolution-independent, self-healing after every resize.
 */
function pinFrustum(camera: THREE.Camera) {
  const ortho = camera as THREE.OrthographicCamera;
  if (ortho.left === -1 && ortho.right === 1 && ortho.top === 1 && ortho.bottom === -1) return;
  ortho.left = -1;
  ortho.right = 1;
  ortho.top = 1;
  ortho.bottom = -1;
  ortho.zoom = 1;
  ortho.updateProjectionMatrix();
}

function LiquidPlane() {
  /* The canvas fills the band's wrapper, so the element R3F already owns *is* the geometry this
     plane needs — measured from its parent, never from a prop thread. */
  const gl = useThree((state) => state.gl);
  const host = gl.domElement.parentElement ?? gl.domElement;
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load("/brand/an-mark.webp");
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  /* Seed uniforms, handed to the material once at construction. Every write after that goes
     through `materialRef.current.uniforms` — the memoised seed stays frozen, as the React
     Compiler requires. */
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uStrength: { value: 0 },
      uSpread: { value: MARK_ASPECT },
      uTexture: { value: texture },
    }),
    [texture],
  );

  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  /* Geometry is read here — once per mount/resize/scroll-burst — and never inside the frame loop.
     The loop only touches the material and the targets the handlers below have already written. */
  const target = useRef({ strength: 0, mx: 0.5, my: 0.5, spread: MARK_ASPECT });
  useEffect(() => {
    let rect = host.getBoundingClientRect();
    let dirty = false;
    const measure = () => {
      rect = host.getBoundingClientRect();
      /* The quad covers the band, so the slice of u the mark may occupy is its own aspect
         divided by the band's: at 1440×670 the mark keeps its 174:112 shape instead of
         stretching across the screen. */
      const bandAspect = rect.width / Math.max(1, rect.height);
      target.current.spread = Math.min(1.1, Math.max(0.2, MARK_ASPECT / bandAspect));
    };
    measure();
    const onScroll = () => {
      dirty = true;
    };
    const onResize = () => measure();
    const onMove = (event: PointerEvent) => {
      if (dirty) {
        measure();
        dirty = false;
      }
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) {
        target.current.strength = 0;
        return;
      }
      target.current.strength = 1;
      target.current.mx = (event.clientX - rect.left) / Math.max(1, rect.width);
      target.current.my = 1 - (event.clientY - rect.top) / Math.max(1, rect.height);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      texture.dispose();
    };
  }, [host, texture]);

  useFrame((state, delta) => {
    pinFrustum(state.camera);
    const material = materialRef.current;
    if (!material) return;
    const { uTime, uMouse, uStrength, uSpread } = material.uniforms;
    if (!uTime || !uMouse || !uStrength || !uSpread) return;
    uTime.value += Math.min(delta, 0.05);
    uSpread.value = target.current.spread;
    /* Ease toward what the handlers wrote. */
    uStrength.value += (target.current.strength - uStrength.value) * 0.12;
    uMouse.value.x += (target.current.mx - uMouse.value.x) * 0.2;
    uMouse.value.y += (target.current.my - uMouse.value.y) * 0.2;
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthTest={false}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export default function AnMonogramLiquid() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [supported] = useState(() => webglAvailable());

  useEffect(() => {
    if (!supported) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? false),
      { rootMargin: "15% 0px" },
    );
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [supported]);

  if (!supported) return null;

  return (
    <div ref={wrapRef} style={WRAP_STYLE}>
    <Canvas
      /* The loop runs only while the band is on screen; scrolled away it is "never" — zero GPU
         work for a band nobody sees. */
      frameloop={inView ? "always" : "never"}
      orthographic
      camera={{ zoom: 1, position: [0, 0, 1] }}
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearAlpha(0)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <LiquidPlane />
    </Canvas>
    </div>
  );
}
