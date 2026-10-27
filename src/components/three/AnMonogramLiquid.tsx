"use client";

/**
 * The liquid AN — round 31: real 3D mercury, on the owner's absolute spec.
 *
 * Round 29 shipped a displaced texture on a flat quad; read against a scrolling page it looked
 * like a sticker, and the frozen frame under a parallax transform left a trail. This is the object
 * itself now:
 *
 * - the monogram is solid geometry — every stroke of the A and the N is an extruded shape with a
 *   bevel (`ExtrudeGeometry`), one mesh, one material;
 * - the material is `MeshPhysicalMaterial` at metalness 1 / roughness 0.05, lit by a drei
 *   `<Environment>` built from in-scene Lightformers (a cube-camera bake at mount, no network
 *   fetch, no HDR download), so it reflects like mercury under studio strips;
 * - the melt is a vertex-stage simplex field injected with `onBeforeCompile`: vertices slide along
 *   their normals and the object normal is perturbed by the noise gradient, so the *reflections*
 *   ripple even across the flat caps — liquid metal, not a moving picture;
 * - the cursor is a raycaster: R3F's pointer events carry the hit point in 3D, and a decaying
 *   radial wave pushes the surface away from it;
 * - memory and trails: `frameloop` drops to "demand" the moment the band leaves the viewport (no
 *   frame is rendered off screen, so nothing stale can smear), DPR is capped at 1.5, and the
 *   geometry, material and environment dispose on unmount.
 *
 * This file remains the quarantine: the only module importing three / fiber / drei, loaded through
 * `next/dynamic(ssr:false)` when the band approaches, never on phones, never under reduced motion,
 * never without WebGL.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";

/* ------------------------------------------------------------------ the mark as solid strokes */

type Quad = [number, number, number, number, number, number, number, number];

/**
 * The monogram as stroke quads in a 0..1 box per letter (N offset by 1.28): two legs and a crossbar
 * for the A, two uprights and a diagonal for the N. Extruding strokes instead of outlining glyphs
 * keeps the silhouette exactly the label's angular mark — and overlapping quads share one
 * position-based displacement field, so the unions stay seamless while the metal melts.
 */
const STROKES: Quad[] = [
  // A — left leg, right leg, crossbar
  [0.0, 0.0, 0.17, 0.0, 0.57, 1.0, 0.4, 1.0],
  [0.83, 0.0, 1.0, 0.0, 0.6, 1.0, 0.43, 1.0],
  [0.24, 0.34, 0.76, 0.34, 0.7, 0.5, 0.3, 0.5],
  // N — left upright, diagonal, right upright
  [1.28, 0.0, 1.45, 0.0, 1.45, 1.0, 1.28, 1.0],
  [1.28, 1.0, 1.46, 1.0, 2.28, 0.0, 2.1, 0.0],
  [2.11, 0.0, 2.28, 0.0, 2.28, 1.0, 2.11, 1.0],
];

function buildMonogramGeometry() {
  const shapes = STROKES.map(([x1, y1, x2, y2, x3, y3, x4, y4]) => {
    const shape = new THREE.Shape();
    shape.moveTo(x1, y1);
    shape.lineTo(x2, y2);
    shape.lineTo(x3, y3);
    shape.lineTo(x4, y4);
    shape.closePath();
    return shape;
  });
  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: 0.34,
    steps: 8,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.055,
    bevelSegments: 5,
    curveSegments: 2,
  });
  geometry.center();
  /* The band is wide and short: the mark stands at ~1.9 world units tall and reads against the
     perspective camera at z 4.6. */
  geometry.scale(1.9, 1.9, 1.9);
  return geometry;
}

/* ------------------------------------------------------------------ the melt, in the vertex stage */

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

interface MeltUniforms {
  uTime: { value: number };
  uHit: { value: THREE.Vector3 };
  uHitStrength: { value: number };
}

/**
 * Injected into MeshPhysicalMaterial: the surface breathes along its normals, the cursor's hit
 * point raises a decaying radial wave, and the object normal is bent by the noise gradient so the
 * environment reflection shivers like mercury even where the tessellation is coarse.
 */
function applyMelt(material: THREE.MeshPhysicalMaterial) {
  /* The uniform cells live on the material's userData, created here in the factory: the frame
     loop reaches them through `meshRef.current.material`, a ref chain, which is the only mutation
     path the React Compiler allows. */
  const uniforms: MeltUniforms = {
    uTime: { value: 0 },
    uHit: { value: new THREE.Vector3(99, 99, 99) },
    uHitStrength: { value: 0 },
  };
  material.userData.melt = uniforms;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uHit = uniforms.uHit;
    shader.uniforms.uHitStrength = uniforms.uHitStrength;

    shader.vertexShader =
      /* glsl */ `
      uniform float uTime;
      uniform vec3 uHit;
      uniform float uHitStrength;
      ${SIMPLEX}
      float meltAt(vec3 p) {
        float t = uTime * 0.32;
        float n = snoise3(p * 0.62 + vec3(0.0, t * 0.8, t * 0.55));
        float n2 = snoise3(p * 1.45 - vec3(t * 0.7, 0.0, t * 0.5));
        return n * 0.075 + n2 * 0.035;
      }
      ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <beginnormal_vertex>",
      /* glsl */ `
      #include <beginnormal_vertex>
      {
        float e = 0.09;
        float base = meltAt(position);
        vec3 grad = vec3(
          meltAt(position + vec3(e, 0.0, 0.0)) - base,
          meltAt(position + vec3(0.0, e, 0.0)) - base,
          meltAt(position + vec3(0.0, 0.0, e)) - base
        ) / e;
        objectNormal = normalize(objectNormal - grad * 0.5);
      }
      `,
    );

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      /* glsl */ `
      #include <begin_vertex>
      {
        float melt = meltAt(position);
        vec3 toHit = position - uHit;
        float d = length(toHit);
        float ripple = sin(d * 5.5 - uTime * 6.5) * exp(-d * 1.5) * uHitStrength;
        transformed += normal * (melt + ripple * 0.22);
        /* The whole mark recoils a little from the hand, in 3D. */
        transformed += normalize(toHit + vec3(0.0001)) * ripple * 0.12;
      }
      `,
    );
  };
  material.customProgramCacheKey = () => "an-melt-v1";
  return uniforms;
}

/* ------------------------------------------------------------------ the scene */

function meltOf(mesh: THREE.Mesh | null): MeltUniforms | null {
  const material = mesh?.material as THREE.MeshPhysicalMaterial | undefined;
  return (material?.userData.melt as MeltUniforms | undefined) ?? null;
}

/** iOS 13+ ships device orientation behind a permission that only a user gesture may request. */
function askGyro(asked: { current: boolean }) {
  if (asked.current) return;
  asked.current = true;
  const ctor = window.DeviceOrientationEvent as unknown as
    | { requestPermission?: () => Promise<string> }
    | undefined;
  if (ctor && typeof ctor.requestPermission === "function") {
    ctor.requestPermission().catch(() => {
      /* declined or blocked: the mark simply keeps its own slow turn */
    });
  }
}

function MercuryMonogram() {
  const geometry = useMemo(() => buildMonogramGeometry(), []);
  const material = useMemo(() => {
    const metal = new THREE.MeshPhysicalMaterial({
      color: "#0b0e13",
      metalness: 1,
      roughness: 0.05,
      envMapIntensity: 1.9,
      clearcoat: 0.4,
      clearcoatRoughness: 0.12,
    });
    applyMelt(metal);
    return metal;
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const meshRef = useRef<THREE.Mesh | null>(null);
  const hitTarget = useRef(0);
  /*
   * Round 32, the gyroscope: a phone knows which way gravity pulls, and a native app uses that.
   * `deviceorientation` writes a target tilt into a ref (no loop of our own — the R3F frame below
   * eases towards it), so tilting the phone leans the mark the way a card leans in a hand.
   * Android delivers the events outright; iOS gates them behind a permission that may only be
   * asked for inside a user gesture, which is what `askGyro` on the wrapper's pointerdown does.
   */
  const tiltTarget = useRef({ x: 0, y: 0 });
  const tilt = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onTilt = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma ?? 0;
      const beta = event.beta ?? 0;
      tiltTarget.current.y = Math.max(-1, Math.min(1, gamma / 26));
      tiltTarget.current.x = Math.max(-1, Math.min(1, (beta - 42) / 26));
    };
    window.addEventListener("deviceorientation", onTilt, { passive: true });
    return () => window.removeEventListener("deviceorientation", onTilt);
  }, []);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const uniforms = meltOf(mesh);
    if (!uniforms) return;
    /*
     * Round 32: a phone holds the band portrait. The camera's vertical fov is fixed, so on a
     * narrow aspect the *width* is what runs out — without this fit the mark overflows the glass
     * on exactly the screen the owner cares about most. `viewport` is the world size at z=0,
     * recomputed by R3F on every resize; the mark scales to the smaller of the two axes.
     */
    uniforms.uTime.value += Math.min(delta, 0.05);
    uniforms.uHitStrength.value += (hitTarget.current - uniforms.uHitStrength.value) * 0.1;
    tilt.current.x += (tiltTarget.current.x - tilt.current.x) * 0.06;
    tilt.current.y += (tiltTarget.current.y - tilt.current.y) * 0.06;
    if (mesh) {
      const fit = Math.max(0.42, Math.min(1, state.viewport.width / 5.1, state.viewport.height / 2.5));
      mesh.scale.setScalar(fit);
      /* A slow turn so the metal catches different strips of the environment — the read that
         separates an object from a decal. */
      mesh.rotation.y = Math.sin(state.clock.elapsedTime * 0.16) * 0.22 + tilt.current.y * 0.42;
      mesh.rotation.x = Math.cos(state.clock.elapsedTime * 0.12) * 0.07 + tilt.current.x * 0.24;
    }
  });

  const onMove = (event: ThreeEvent<PointerEvent>) => {
    const uniforms = meltOf(meshRef.current);
    if (!uniforms) return;
    uniforms.uHit.value.copy(event.point);
    hitTarget.current = 1;
  };
  const onOut = () => {
    hitTarget.current = 0;
  };

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      onPointerMove={onMove}
      onPointerOut={onOut}
    />
  );
}

/**
 * The environment is baked in-scene: three light strips and one blue edge, rendered once into a
 * cube map by drei. Mercury needs something to reflect — and this needs no download.
 */
function StudioEnvironment() {
  return (
    <Environment resolution={96} frames={1}>
      {/*
        A metal with metalness 1 has no diffuse term at all: it shows ONLY what the cube sees.
        Round 31's first bake had four strips in a void, so the faces pointing at the camera
        reflected the void — black on black. Now the cube has a floor-to-ceiling studio: a dim
        gradient wall behind the camera for the front faces to catch, a hot key above, cool and
        signal-blue strips on the flanks for the mercury edges, and a near-black floor so the
        undersides stay heavy. Every Lightformer aims at the origin.
      */}
      <color attach="background" args={["#1a212c"]} />
      <Lightformer intensity={3} position={[0, 0.6, 8]} target={[0, 0, 0]} scale={[14, 9, 1]} color="#98a5b8" />
      {/* the horizon streak: one thin hot line behind the camera that every front face drags
          across itself as the mark turns — the signature read of liquid chrome */}
      <Lightformer intensity={4} position={[0, -1.4, 7.5]} target={[0, 0, 0]} scale={[13, 0.9, 1]} color="#eaf3ff" />
      <Lightformer intensity={3.4} position={[0, 4, 3]} target={[0, 0, 0]} scale={[9, 3.4, 1]} color="#ffffff" />
      <Lightformer intensity={2.4} position={[-6, 0.4, 1]} target={[0, 0, 0]} scale={[7, 2.6, 1]} color="#dff9ff" />
      <Lightformer intensity={2.1} position={[6, -0.6, 1]} target={[0, 0, 0]} scale={[7, 2.6, 1]} color="#0087FF" />
      <Lightformer intensity={0.8} position={[0, -5, -2]} target={[0, 0, 0]} scale={[10, 4, 1]} color="#0a0a0c" />
    </Environment>
  );
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

export default function AnMonogramLiquid() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [supported] = useState(() => webglAvailable());
  const gyroAsked = useRef(false);

  useEffect(() => {
    if (!supported) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    /*
     * Strict edges, no margin: this gate drives the render loop, not the chunk fetch (the fetch
     * has its own observer one section up). A margin here would keep a software rasteriser burning
     * full tilt for a band that is still a viewport away — round 31 measured the whole page dropping
     * to 3 fps under SwiftShader with a 15% margin, because "almost in view" still renders.
     */
    const observer = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? false),
      { rootMargin: "0px 0px" },
    );
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [supported]);

  if (!supported) return null;

  return (
    <div ref={wrapRef} style={WRAP_STYLE} onPointerDown={() => askGyro(gyroAsked)}>
      <Canvas
        /* "demand" off screen: the loop is parked, no frame is drawn, nothing stale can trail
           across the band while the reader scrolls. Back in view it runs again. */
        frameloop={inView ? "always" : "demand"}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 4.6], fov: 38 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearAlpha(0);
          /* ACES eats mid-tones hard; the mercury needs its greys pushed back up or every face
             that is not a strip highlight collapses to ink. */
          gl.toneMappingExposure = 1.25;
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          /* A finger dragging across the band should ripple the metal, not be eaten by the
             canvas — but the page must still scroll: pan-y hands vertical gestures back to the
             browser and keeps horizontal ones for the raycaster. */
          touchAction: "pan-y",
        }}
      >
        <MercuryMonogram />
        <StudioEnvironment />
      </Canvas>
    </div>
  );
}
