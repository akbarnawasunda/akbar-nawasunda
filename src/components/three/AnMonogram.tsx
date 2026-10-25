"use client";

import { useEffect, useRef } from "react";

import styles from "./AnMonogram.module.css";
import { perfFlag } from "../zine/perf-flags";

/**
 * The one canvas on the site: the AN monogram, extruded from the owner's real mark.
 *
 * Round 14 reversed round 13 here, on the owner's instruction and with the owner's own banner as the
 * reference: the brand identity for this mark is *futuristic, cyberpunk, metallic, high-tech* — a
 * black chrome object with neon blue light coming off its edges, not a flat paper cut-out. The zine
 * palette is printed stock for the page; the object is the one thing on the site that is allowed to
 * look like a machine.
 *
 * What it is:
 * - **Black chrome.** `MeshPhysicalMaterial`, metalness 0.9, roughness 0.1, clearcoat 1 with
 *   clearcoatRoughness 0.06. The reflection is a real one — an authored, blue-only environment
 *   through a PMREM generator, so the object has something to be chrome *of*. Without the
 *   environment a metal material is a black silhouette: metal only exists as what it reflects. It
 *   is deliberately *not* `RoomEnvironment`, whose white studio panels blow out a 0.9-metalness
 *   surface into white patches; this brand's chrome reflects a dark room with neon in it.
 * - **Neon edge.** The silhouette edges are drawn in `#0087FF` (the brand's neon blue) with a second,
 *   additive halo shell just outside them, and a blue `PointLight` raking the object from the left so
 *   the bevels catch it. Everything blue is deliberately above the bloom threshold, which is what
 *   turns a line into a glow.
 * - **A dark stage.** The canvas paints its own backdrop — a deep blue vignette, a perspective grid
 *   receding to a horizon and slow horizontal speed lines — in a shader, not a CSS gradient. This is
 *   also the fallback if post-processing cannot load: the scene still has depth without bloom.
 * - **Bloom**, when the browser can afford it: `EffectComposer` + `RenderPass` + `UnrealBloomPass` +
 *   `OutputPass`, imported as a separate lazy chunk. If that import fails the scene renders straight
 *   to the canvas and nothing else changes.
 *
 * **Round 15, part two — liquid metal.** The object is now animated in the vertex shader rather than
 * merely rotated: a 3D simplex noise field displaces every vertex of the extrusion, a gaussian bump
 * with a travelling ring swells the metal under the pointer, and the plate leans towards the cursor
 * with a smoothed, weighted lerp. The rules of the earlier rounds still hold (this is still the one
 * canvas, it still never mounts below 768 px, it still pauses off-screen), but the frame budget is
 * now adaptive: 30 fps at rest, 60 fps while the object is being touched, because an effect about
 * contact cannot lag the contact. The noise is injected with `onBeforeCompile` into the *same*
 * `MeshPhysicalMaterial` — the clearcoat, the PMREM room and the tone mapping are all preserved — so
 * the metal is still chrome, it is just no longer rigid.
 *
 * Cost control, in order of importance:
 * - nothing is imported until the page has loaded *and* the band is within one screen of the
 *   viewport, so the bundle, the shader compile and the env-map pass all land after LCP — and on a
 *   page nobody has scrolled yet, they never land at all;
 * - **nothing mounts at all below 768 px**: a phone gets the band without the renderer. Bloom on a
 *   mobile GPU is a 4-pass mip chain over a full-screen quad; that is not a decoration a phone needs;
 * - **the loop is cancelled, not throttled, when the canvas leaves the viewport**: the
 *   `IntersectionObserver` calls `pause()`, which clears the pending `requestAnimationFrame`. An
 *   off-screen canvas costs zero frames and zero draw calls — measured, not assumed;
 * - **devicePixelRatio is capped at 1.5**, and the bloom pass renders at half resolution: a glow is
 *   the one thing in a frame that does not need the pixels;
 * - **the scene is painted at 30 fps until it is touched, and 60 while it is**. At rest what moves
 *   is a slow float and the shader clock, which reads fine at 30; the extra frames only exist while
 *   the pointer is on the object, and the strength decay puts it back;
 * - `prefers-reduced-motion: reduce` renders one frame and never starts the loop;
 * - WebGL failure is silent: the hero is designed to be complete without it.
 */

/** The brand's neon. The one place on the site this blue is allowed to exist after round 13. */
const NEON = 0x0087ff;

export function AnMonogram() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    /* Ablation switch: `?perf=nocanvas` never imports three.js, so the scene cannot be measured
       against the rest of the page while it is also running. */
    if (perfFlag("nocanvas")) return;
    /*
     * No scene on a phone.
     *
     * The gate is a media query read once at mount, deliberately: this is not a pointer hint (which
     * would be `pointerType`), it is a decision about whether to allocate a renderer on a device we
     * are not going to show it to. On a phone the band is designed to read without the object: the
     * heading, the rules and the note are the whole composition.
     */
    if (window.matchMedia("(max-width: 767px)").matches) return;

    // Bound once: TypeScript cannot narrow a ref across the closures below.
    const stage: HTMLDivElement = host;
    let dispose: (() => void) | undefined;
    let cancelled = false;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    /** Fired once, when the band is close enough that the import cannot hurt the first screen. */
    const start = () => {
      if (cancelled || dispose) return;
      void mount().catch(() => {
        /* No WebGL, no second attempt: the hero stands on its own. */
      });
    };

    async function mount() {
      const [THREE, { anShape }, post] = await Promise.all([
        import("three"),
        import("@/assets/an-shape"),
        /*
         * Post-processing is its own lazy chunk, and its failure is not the scene's failure: a
         * browser that refuses to compile the bloom shaders still gets a chrome object on a grid.
         */
        import("three/examples/jsm/postprocessing/EffectComposer.js")
          .then(async ({ EffectComposer }) => {
            const [{ RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
              import("three/examples/jsm/postprocessing/RenderPass.js"),
              import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
              import("three/examples/jsm/postprocessing/OutputPass.js"),
            ]);
            return { EffectComposer, RenderPass, UnrealBloomPass, OutputPass };
          })
          .catch(() => null),
      ]);
      if (cancelled) return;

      /**
       * The canvas is attached only after the context exists. Constructing the renderer is the step
       * that fails on a machine without WebGL, and a canvas appended before it stays in the DOM
       * afterwards as a 300x150 grey rectangle — found in a Playwright CLI run where the browser had
       * no SwiftShader libraries. An unattached canvas cannot leave that scar.
       */
      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-hidden", "true");

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          /* Bloom is the antialiasing here: it softens exactly the high-contrast edges — the neon
             lines — that would otherwise stair-step, for free. MSAA on top would double the
             fragment cost of the object and the full-screen bloom chain. */
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
        });
      } catch {
        return;
      }
      stage.appendChild(canvas);
      /*
       * 1.5, not 1 and not 2. The object is chrome with a specular highlight and a clearcoat lobe —
       * at 1 the bevel reads soft on a 2x display; at 2 the frame is four times the fragments for a
       * difference the bloom hides anyway.
       */
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearAlpha(0);
      /* ACES, back on: it is what keeps a chrome highlight from clipping to a white blob. */
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(0, 0, 3.1);

      /*
       * The room, authored rather than borrowed.
       *
       * `RoomEnvironment` is a bright white studio, and on a 0.9-metalness surface its light panels
       * reflect as blown-out white patches — the first pass of this scene had a white wing instead
       * of a chrome one. It is also the wrong room for this brand: the reference banner is a black
       * object in a dark blue space with neon, so the thing the chrome has to reflect is *dark, with
       * blue in it*.
       *
       * So the environment is drawn here as an equirectangular canvas — a cold vertical wash, one
       * broad neon pool where the point light sits, a second dimmer one on the far side so the back
       * of the extrusion is not pure black, and a thin overhead strip that gives the bevels their
       * single specular line. Then PMREM, once, at mount. No download, no white.
       */
      const buildEnvironment = () => {
        const width = 1024;
        const height = 512;
        const source = document.createElement("canvas");
        source.width = width;
        source.height = height;
        const context = source.getContext("2d");
        if (!context) return null;

        // Sky → floor: navy at the top, ink at the bottom.
        const sky = context.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, "#0a1b33");
        sky.addColorStop(0.46, "#060d18");
        sky.addColorStop(1, "#02040a");
        context.fillStyle = sky;
        context.fillRect(0, 0, width, height);

        /*
         * The key pool: where the PointLight sits, so the reflection and the light agree. Large in
         * solid angle on purpose — a small bright spot is a pinpoint highlight on one bevel; a broad
         * pool is what makes the whole face read as a curved, reflective surface.
         */
        const pool = context.createRadialGradient(width * 0.3, height * 0.44, 0, width * 0.3, height * 0.44, width * 0.46);
        pool.addColorStop(0, "rgba(120, 190, 255, 1)");
        pool.addColorStop(0.3, "rgba(0, 135, 255, 0.85)");
        pool.addColorStop(0.66, "rgba(0, 70, 160, 0.35)");
        pool.addColorStop(1, "rgba(0, 0, 0, 0)");
        context.fillStyle = pool;
        context.fillRect(0, 0, width, height);

        // The far pool: a second, weaker light on the opposite side so the back reads as chrome too.
        const far = context.createRadialGradient(width * 0.8, height * 0.56, 0, width * 0.8, height * 0.56, width * 0.34);
        far.addColorStop(0, "rgba(60, 150, 255, 0.85)");
        far.addColorStop(0.5, "rgba(0, 90, 200, 0.35)");
        far.addColorStop(1, "rgba(0, 0, 0, 0)");
        context.fillStyle = far;
        context.fillRect(0, 0, width, height);

        /*
         * The horizon: a horizontal band of light at eye level. This is the single most useful shape
         * in a chrome environment — it is what draws the bright line across a curved edge and tells
         * the eye the surface is turning away. Blue-white, hard-edged at the top, falling off below.
         */
        const horizon = context.createLinearGradient(0, height * 0.3, 0, height * 0.62);
        horizon.addColorStop(0, "rgba(150, 210, 255, 0.92)");
        horizon.addColorStop(0.12, "rgba(40, 140, 255, 0.55)");
        horizon.addColorStop(1, "rgba(0, 0, 0, 0)");
        context.fillStyle = horizon;
        context.fillRect(0, height * 0.3, width, height * 0.32);

        // Two overhead strips: the milled highlight that travels along the bevel as the object turns.
        context.fillStyle = "rgba(200, 230, 255, 0.95)";
        context.fillRect(0, height * 0.1, width, height * 0.03);
        context.fillStyle = "rgba(120, 185, 255, 0.5)";
        context.fillRect(0, height * 0.18, width, height * 0.012);

        const texture = new THREE.CanvasTexture(source);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      };

      const envSource = buildEnvironment();
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      const envTexture = envSource
        ? pmrem.fromEquirectangular(envSource).texture
        : pmrem.fromScene(new THREE.Scene(), 0).texture;
      scene.environment = envTexture;
      envSource?.dispose();

      /*
       * One raking neon light from the left, exactly as the banner does it: the bevels and the walls
       * catch blue, the front stays black chrome. No key light, no fill, no rim — a second light
       * would flatten the object back into a product render.
       */
      const neonLight = new THREE.PointLight(NEON, 120, 0, 2);
      neonLight.position.set(-2.2, 1.1, 2.4);
      scene.add(neonLight);

      /*
       * A second, dimmer light behind and to the right. Not a fill: it exists so the far wall of the
       * extrusion picks up blue instead of going to pure black, which is the difference between a
       * metal object and a silhouette with an outline.
       */
      const rimLight = new THREE.PointLight(NEON, 14, 0, 2);
      rimLight.position.set(2.9, 1.7, -0.9);
      scene.add(rimLight);

      // --- geometry: every ring of every traced polygon becomes a shape (first ring) + holes.
      const shapes = anShape.map(([outer, ...holes]) => {
        const shape = new THREE.Shape();
        if (!outer) return shape;
        outer.forEach(([x, y], index) => (index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
        shape.closePath();
        for (const hole of holes) {
          const path = new THREE.Path();
          hole.forEach(([x, y], index) => (index === 0 ? path.moveTo(x, y) : path.lineTo(x, y)));
          path.closePath();
          shape.holes.push(path);
        }
        return shape;
      });

      const geometry = new THREE.ExtrudeGeometry(shapes, {
        depth: 0.2,
        bevelEnabled: true,
        bevelThickness: 0.022,
        bevelSize: 0.016,
        bevelSegments: 4,
        curveSegments: 1,
      });
      geometry.center();
      geometry.computeVertexNormals();

      /*
       * ------------------------------------------------------------------ liquid metal
       *
       * The object is no longer a rigid sculpture that rotates: it is a surface that flows. Two
       * things do the work, and both are shader work — there is no physics engine here (a rigid-body
       * solver would simulate *bodies*, and this is one continuous surface whose only forces are a
       * noise field and a pointer).
       *
       * 1. **A noise flow field.** A 3D simplex noise (Ashima/Gustavson, MIT) sampled at three
       *    offsets produces a vector; every vertex of the extruded mark is pushed along it. Because
       *    the displacement is a function of *position only* — never of `normal` — the exact same
       *    offset can be injected into the three materials that draw the object (chrome, neon edge,
       *    halo). That is what keeps the blue rim welded to the surface while the surface moves: an
       *    outline that does not follow its own object reads as a sticker.
       *
       * 2. **A touch field.** A gaussian bump plus a travelling ring around the pointer, in the
       *    plate's own XY plane, pushes outwards and towards the viewer. The uniform is written from
       *    a raycast into a camera-facing plane through the object, so a bulge appears *under the
       *    cursor* rather than at a screen-space guess.
       *
       * The normals are perturbed by the same noise in the vertex shader. A chrome surface with a
       * perfect normal and a moving silhouette would look like a warped photograph; the light has to
       * ripple across the face as well, and that costs one extra noise sample rather than a
       * tessellated, subdivided mesh.
       */
      const LIQUID_GLSL = /* glsl */ `
        uniform float uTime;
        uniform float uAmp;
        uniform float uWarp;
        uniform vec3 uPointer;
        uniform float uStrength;

        vec3 anMod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 anMod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 anPermute(vec4 x) { return anMod289(((x * 34.0) + 1.0) * x); }
        vec4 anTaylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float anSnoise(vec3 v) {
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
          i = anMod289(i);
          vec4 p = anPermute(anPermute(anPermute(
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
          vec4 norm = anTaylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
        }

        /* Three decorrelated samples: a vector field, not a height field. Independent x/y/z is what
           makes the surface look poured rather than embossed. */
        vec3 anFlow(vec3 p) {
          vec3 q = p * 2.3;
          float t = uTime * 0.34;
          return vec3(
            anSnoise(q + vec3(0.0, 0.0, t)),
            anSnoise(q.yzx + vec3(11.3, t * 0.8, 4.7)),
            anSnoise(q.zxy + vec3(3.1, 7.7, t * 1.1))
          );
        }

        /* The touch: a bump that swells under the pointer, plus a ring that travels out from it, so
           a resting finger keeps radiating instead of parking one dent in the metal. */
        float anTouch(vec3 p) {
          float d = length(p.xy - uPointer.xy);
          /* Wide and soft, not a pinprick: a thumb pressed into mercury makes a shallow bowl the
             width of the whole hand, and the first version of this was tight enough to pinch the
             bevel into spikes. */
          float bump = exp(-d * d * 7.0);
          float ring = sin(d * 18.0 - uTime * 4.5) * exp(-d * 2.6) * 0.30;
          return (bump + ring) * uStrength;
        }

        vec3 anOffset(vec3 p) {
          /* Mostly out of the plate with a radial component, so a bulge lifts towards the reader and
             also parts sideways, the way a liquid does when something presses into it. */
          vec3 dir = normalize(vec3(p.xy * 0.6, 1.0));
          return anFlow(p) * uAmp + dir * anTouch(p) * 0.045;
        }
      `;

      /*
       * One set of uniform objects, shared by reference into every patched material, so the frame
       * loop writes `uTime` once instead of once per material.
       */
      const liquid = {
        uTime: { value: 0 },
        uAmp: { value: 0.026 },
        uWarp: { value: 0.55 },
        uPointer: { value: new THREE.Vector3(0, 0, 0) },
        uStrength: { value: 0 },
      };

      /**
       * Injects the flow into a stock three material.
       *
       * `onBeforeCompile` rather than a hand-written `ShaderMaterial`: this object lives or dies by
       * `MeshPhysicalMaterial` — clearcoat, metalness, the PMREM environment, tone mapping. Writing
       * the whole shader by hand would mean re-implementing all of that (and re-testing it against
       * every three release). Patching two chunks keeps every one of those lobes.
       *
       * `displaceNormals` is on only for the chrome: the edge lines and the halo are unlit, and a
       * normal they never read would be a wasted sine.
       */
      const patchLiquid = (
        material: InstanceType<typeof THREE.Material>,
        { displaceNormals = false } = {},
      ) => {
        material.onBeforeCompile = (shader) => {
          Object.assign(shader.uniforms, liquid);
          shader.vertexShader = shader.vertexShader
            .replace("#include <common>", `#include <common>\n${LIQUID_GLSL}`)
            .replace(
              "#include <begin_vertex>",
              /* The one line that makes it liquid. Everything downstream — the env lookup, the
                 bloom, the edge shell — follows this vertex. */
              "vec3 transformed = position + anOffset(position);",
            );
          if (displaceNormals) {
            shader.vertexShader = shader.vertexShader.replace(
              "#include <beginnormal_vertex>",
              `vec3 objectNormal = normalize(normal + anFlow(position * 1.1) * uWarp);
              #ifdef USE_TANGENT
                vec3 objectTangent = vec3(tangent.xyz);
              #endif`,
            );
          }
        };
        /* Without a cache key three would reuse the *unpatched* program for a material compiled
           earlier in the same context — the classic silent `onBeforeCompile` no-op. */
        material.customProgramCacheKey = () => (displaceNormals ? "an-liquid-lit" : "an-liquid-basic");
        material.needsUpdate = true;
      };

      /*
       * Liquid chrome: metalness 1, roughness 0.1. The round-14 object ran 0.9 / 0.16, which is
       * black *painted* chrome; a mirror needs the full 1.0, and at 0.1 roughness the PMREM room is
       * reflected sharply enough that the noise in the vertex shader reads as movement of the metal
       * rather than as a wobble of a matte surface.
       *
       * `color` stays a near-black blue-grey rather than #000: a metal with no albedo is a hole.
       */
      const chrome = new THREE.MeshPhysicalMaterial({
        color: 0x23262f,
        metalness: 1,
        roughness: 0.1,
        clearcoat: 0.7,
        clearcoatRoughness: 0.05,
        reflectivity: 0.7,
        envMapIntensity: 2.1,
      });
      patchLiquid(chrome, { displaceNormals: true });

      const mesh = new THREE.Mesh(geometry, chrome);

      /**
       * The glow has two halves, because a single line cannot both be sharp and be a halo:
       * - the edge itself, in neon, drawn on the silhouette;
       * - a shell of the same geometry a few percent larger, additive and back-faced, so the object
       *   appears to be emitting from just outside its own outline.
       *
       * Both are above the bloom threshold, which is what the composer turns into light.
       */
      const edges = new THREE.EdgesGeometry(geometry, 24);
      const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x7fc4ff, transparent: true, opacity: 1 });
      patchLiquid(edgeMaterial);
      const neonEdge = new THREE.LineSegments(edges, edgeMaterial);
      neonEdge.scale.setScalar(1.004);

      const haloMaterial = new THREE.MeshBasicMaterial({
        color: NEON,
        transparent: true,
        opacity: 0.05,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      patchLiquid(haloMaterial);
      const halo = new THREE.Mesh(geometry, haloMaterial);
      halo.scale.setScalar(1.045);

      const group = new THREE.Group();
      group.add(mesh, halo, neonEdge);
      group.rotation.set(-0.08, -0.5, 0.03);
      // The mark is wider than tall; fit the long side to the frame and keep its aspect.
      const fit = 1.75;
      const baseScale = fit;
      group.scale.setScalar(baseScale);
      scene.add(group);

      // --- the stage: a shader backdrop, not a CSS gradient.
      const backdropUniforms = {
        uTime: { value: 0 },
        uNeon: { value: new THREE.Color(NEON) },
      };
      const backdrop = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.ShaderMaterial({
          uniforms: backdropUniforms,
          depthWrite: false,
          depthTest: false,
          vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          /*
           * Four passes of ink, all hard-edged maths, no textures:
           * 1. a vertical wash from cold navy at the top to near-black at the floor;
           * 2. a horizon band that is brightest where the grid converges;
           * 3. a perspective grid (one set of lines converging to the vanishing point, one set of
           *    horizontals drifting towards the camera) in neon at low alpha;
           * 4. slow horizontal speed lines, picked per row by a hash so they are not a lattice.
           * A vignette closes the frame so the canvas never ends on a visible rectangle.
           */
          fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform vec3 uNeon;
            varying vec2 vUv;

            float hash(float n) { return fract(sin(n * 78.233) * 43758.5453); }

            void main() {
              vec2 uv = vUv;
              vec2 p = uv - vec2(0.5, 0.44);

              vec3 colour = mix(vec3(0.006, 0.009, 0.016), vec3(0.016, 0.042, 0.088), pow(uv.y, 1.5));

              float horizon = exp(-pow((uv.y - 0.44) * 6.5, 2.0));
              colour += uNeon * horizon * 0.05;

              float depth = abs(p.y) + 0.20;
              float converge = p.x / depth;
              float vertical = 1.0 - smoothstep(0.0, 0.022, abs(fract(converge * 5.0 + 0.5) - 0.5));
              float horizontal = 1.0 - smoothstep(
                0.0,
                0.03,
                abs(fract((1.0 / depth) * 0.42 + uTime * 0.025) - 0.5)
              );
              float gridFade = smoothstep(0.02, 0.24, abs(p.y)) * (1.0 - smoothstep(0.34, 0.60, abs(p.y)));
              /*
                The copy mask. The heading, the note and the meta line live in the bottom-left
                corner, and a perspective grid drawn *behind* them is not depth, it is interference:
                the eye cannot separate a 17 px paragraph from a bright diagonal crossing it. So the
                grid does not reach that corner at all — it fades in as it passes the copy column.
              */
              float copyMask = smoothstep(0.30, 0.58, uv.x);
              colour += uNeon * (vertical * 0.26 + horizontal * 0.14) * gridFade * copyMask;

              float row = floor(uv.y * 30.0);
              float drift = fract(uv.x * 1.6 - uTime * (0.015 + hash(row) * 0.045) + hash(row + 7.0));
              float streak = smoothstep(0.0, 0.05, drift) * (1.0 - smoothstep(0.05, 0.42, drift));
              colour += uNeon * streak * step(0.78, hash(row)) * 0.18 * gridFade * copyMask;

              /*
               * The scrim. Half this band is type — the heading, the note and the meta sit on the
               * left third — and a stage bright enough to make chrome read is a stage that turns
               * paper-white body copy into grey mush. So the grid fades out towards the copy column
               * instead of the copy fighting it: the light is on the object, the words are on ink.
               */
              /*
                Two axes, because the copy is in the bottom-left corner, not in a column: the light
                fades out towards the left edge AND towards the bottom of the band, so the paragraph
                and the meta line sit on ink while the object keeps its stage.
              */
              float across = smoothstep(0.04, 0.55, uv.x);
              float up = smoothstep(0.0, 0.42, uv.y);
              float scrim = mix(0.35, 1.0, pow(max(across, up), 0.8));
              float vignette = 1.0 - 0.72 * smoothstep(0.28, 0.95, length(p * vec2(1.22, 1.0)));
              colour *= scrim;
              gl_FragColor = vec4(colour * vignette, 1.0);
            }
          `,
        }),
      );
      backdrop.position.z = -1.2;
      backdrop.renderOrder = -1;
      scene.add(backdrop);

      /**
       * Composition, not a background: the mark sits behind the portrait on wide screens and drifts
       * to the centre behind the stacked hero on a phone. The offset is read from the layout, so the
       * scene never guesses where the portrait is.
       */
      const placeGroup = () => {
        const wide = window.matchMedia("(min-width: 1024px)").matches;
        group.position.x = wide ? 0.46 : 0.0;
        group.position.y = wide ? 0.02 : 0.1;
        group.userData.baseY = group.position.y;
      };
      placeGroup();

      // --- sizing
      const bloomScale = 0.5;
      /*
       * Types from the modules themselves, not `InstanceType<typeof post.X>`: the post-processing
       * import is allowed to fail, so `post` is nullable — but the *shapes* are fixed, and the
       * renderer only ever calls render/setSize/dispose on the composer.
       */
      type Composer = InstanceType<
        (typeof import("three/examples/jsm/postprocessing/EffectComposer.js"))["EffectComposer"]
      >;
      type BloomPass = InstanceType<
        (typeof import("three/examples/jsm/postprocessing/UnrealBloomPass.js"))["UnrealBloomPass"]
      >;
      let composer: Composer | null = null;
      let bloom: BloomPass | null = null;

      const sizeBackdrop = (aspect: number) => {
        /* Cover the frustum at the backdrop's depth, then a little more so a resize never shows an
           edge before the next frame. */
        const distance = camera.position.z - backdrop.position.z;
        const height = 2 * Math.tan((camera.fov * Math.PI) / 360) * distance;
        backdrop.scale.set(height * aspect * 1.05, height * 1.05, 1);
      };

      const resize = () => {
        const { clientWidth, clientHeight } = stage;
        if (clientWidth === 0 || clientHeight === 0) return;
        renderer.setSize(clientWidth, clientHeight, false);
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
        sizeBackdrop(camera.aspect);
        placeGroup();
        if (composer) composer.setSize(clientWidth, clientHeight);
        if (bloom) bloom.setSize(clientWidth * bloomScale, clientHeight * bloomScale);
      };

      if (post) {
        try {
          const created = new post.EffectComposer(renderer);
          created.addPass(new post.RenderPass(scene, camera));
          const bloomPass = new post.UnrealBloomPass(
            new THREE.Vector2(1, 1),
            /* strength — enough to read as light, not enough to erase the chrome underneath */
            0.55,
            /* radius — a wide, soft falloff, like a lens, not a sticker */
            0.5,
            /*
             * threshold. The first pass used 0.62 and the whole highlight bloomed, so the neon edge
             * came out white-hot and the blue was gone — a glow that eats its own colour. At 0.72
             * only the edge lines and the halo cross it, and they stay blue.
             */
            0.72,
          );
          created.addPass(bloomPass);
          created.addPass(new post.OutputPass());
          composer = created;
          bloom = bloomPass;
        } catch {
          composer = null;
          bloom = null;
        }
      }

      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(stage);

      // --- scroll: the mark grows and turns as the hero leaves the frame
      let scrollProgress = 0;
      const readScroll = () => {
        const rect = stage.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
        scrollProgress = progress;
      };
      readScroll();

      let raf = 0;
      let visible = true;

      /*
       * --- the pointer.
       *
       * Three rules, all of them learned the hard way elsewhere in this codebase:
       *
       * - **never read the layout in the event handler.** A 1000 Hz mouse would force a synchronous
       *   layout on every move. The handler stores `clientX/clientY` and nothing else; the rect is
       *   read once per painted frame, which is also the only moment the answer is used.
       * - **gate on the event, not on a media query.** `pointermove` from a finger counts, so a
       *   tablet gets the same ripple a mouse does; `prefers-reduced-motion` is handled by never
       *   starting the loop in the first place.
       * - **convert to object space through a real ray.** The plate is rotated and scaled by the
       *   scroll; a screen-space guess would put the bulge in the wrong place on every angle but
       *   zero, and the whole point of the effect is that the metal reacts *where you touched it*.
       */
      const pointer = { has: false, x: 0, y: 0 };
      const ray = new THREE.Ray();
      const plane = new THREE.Plane();
      const hit = new THREE.Vector3();
      const cameraDir = new THREE.Vector3();
      const local = new THREE.Vector3();
      /* Smoothed state: the pointer *targets* the object, so a snap of the mouse is a lean, not a
         teleport. Everything here is integrated against dt, not per frame, or it would be twice as
         fast on a 120 Hz display as on a 60 Hz one. */
      let strength = 0;
      let leanYaw = 0;
      let leanPitch = 0;
      /* True only while the pointer is inside the band. The frame budget keys off this and off
         `strength`, never off "the mouse has moved at some point in this session" — that flag stays
         true forever and would pin the scene to 60 fps for the rest of the visit. */
      let overBand = false;

      const onPointerMove = (event: PointerEvent) => {
        pointer.has = true;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        /* Touch has no hover: a finger that is down and moving is interaction, and that is the only
           moment we can honour. It goes through the same path as the mouse. */
        if (event.pointerType !== "mouse" || event.buttons > 0) play();
      };
      const onPointerOff = () => {
        pointer.has = false;
        overBand = false;
      };
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerdown", onPointerMove, { passive: true });
      window.addEventListener("pointerup", onPointerOff, { passive: true });
      window.addEventListener("blur", onPointerOff);

      const ease = (current: number, target: number, rate: number, dt: number) =>
        current + (target - current) * (1 - Math.exp(-rate * dt));

      /**
       * Paint budget. Idle is 30 fps, the same as round 14, because a breathing object and a slow
       * shader clock do not need more. The moment the metal is being touched it goes to 60: the
       * ripple has to track the cursor, and a 33 ms lag on an effect that is *about* contact reads
       * as a broken promise. It drops back to 30 when the strength decays, so the extra frames only
       * exist while a hand is on it.
       */
      let paintedAt = 0;
      let startedAt = 0;

      const paint = () => {
        if (composer) composer.render();
        else renderer.render(scene, camera);
      };

      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        const hot = strength > 0.02 || overBand;
        const frameMs = 1000 / (hot ? 60 : 30);
        if (now - paintedAt < frameMs - 1) return;
        const dt = paintedAt ? Math.min(0.1, (now - paintedAt) / 1000) : 1 / 30;
        paintedAt = now;
        if (!startedAt) startedAt = now;
        const elapsed = (now - startedAt) / 1000;
        backdropUniforms.uTime.value = elapsed;
        liquid.uTime.value = elapsed;

        /* --- pointer → object space, once per painted frame. */
        let targetStrength = 0;
        let targetYaw = 0;
        let targetPitch = 0;
        if (pointer.has) {
          const rect = stage.getBoundingClientRect();
          const inside =
            pointer.x >= rect.left &&
            pointer.x <= rect.right &&
            pointer.y >= rect.top &&
            pointer.y <= rect.bottom;
          overBand = inside;
          const nx = ((pointer.x - rect.left) / Math.max(1, rect.width)) * 2 - 1;
          const ny = -(((pointer.y - rect.top) / Math.max(1, rect.height)) * 2 - 1);
          if (inside) {
            camera.getWorldDirection(cameraDir);
            plane.setFromNormalAndCoplanarPoint(cameraDir, group.position);
            ray.origin.copy(camera.position);
            ray.direction.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize();
            if (ray.intersectPlane(plane, hit)) {
              group.updateMatrixWorld();
              local.copy(hit);
              group.worldToLocal(local);
              /* The plate is ~1.1 units wide; clamp so a pointer at the very edge of the band
                 cannot park the bulge a metre outside the object. */
              liquid.uPointer.value.set(
                Math.max(-0.9, Math.min(0.9, local.x)),
                Math.max(-0.7, Math.min(0.7, local.y)),
                0,
              );
              targetStrength = 1;
            }
            targetYaw = nx * 0.2;
            targetPitch = ny * 0.11;
          }
        } else {
          overBand = false;
        }

        strength = ease(strength, targetStrength, targetStrength > strength ? 9 : 3, dt);
        leanYaw = ease(leanYaw, targetYaw, 5, dt);
        leanPitch = ease(leanPitch, targetPitch, 5, dt);
        liquid.uStrength.value = strength;
        /* The flow itself is never fully off — a liquid at rest is still moving, and a completely
           static silhouette between touches is what makes an interactive object feel dead. */
        liquid.uAmp.value = 0.018 + strength * 0.014;

        if (!reduceMotion.matches) {
          /*
           * Idle: breathing, not rotating. A slow vertical float with a phase offset against a much
           * slower yaw sway, so the object reads as suspended in something rather than mounted on a
           * turntable. Both amplitudes are small on purpose — the motion should be noticed only when
           * you stop reading.
           */
          const drift = Math.sin(elapsed * 0.62);
          const sway = Math.sin(now / 5200) * 0.2;
          group.rotation.y = -0.28 + sway + leanYaw;
          group.rotation.x = -0.05 + Math.sin(now / 3400) * 0.025 + leanPitch;
          group.position.y = (group.userData.baseY ?? 0) + drift * 0.035;
          /* The light breathes with it: the highlight crossing the bevel is most of what sells the
             surface as metal, so it should have a pulse of its own. */
          neonLight.position.x = -2.2 + Math.sin(now / 4300) * 0.45 + leanYaw * 2.4;
          neonLight.position.y = 1.1 + Math.cos(now / 6100) * 0.3 + leanPitch * 2.2;
        }

        const eased = 1 - Math.pow(1 - scrollProgress, 3);
        const target = baseScale * (1 + eased * 0.55);
        group.scale.setScalar(group.scale.x + (target - group.scale.x) * 0.15);
        group.rotation.z = 0.03 - eased * 0.06;
        paint();
      };

      const play = () => {
        if (raf || !visible || reduceMotion.matches) return;
        raf = requestAnimationFrame(frame);
      };
      const pause = () => {
        if (!raf) return;
        cancelAnimationFrame(raf);
        raf = 0;
      };

      const onScroll = () => readScroll();
      const onVisibility = () => (document.hidden ? pause() : play());
      window.addEventListener("scroll", onScroll, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);

      const onReducedMotionChange = () => {
        if (reduceMotion.matches) {
          pause();
          paint();
        } else {
          play();
        }
      };
      reduceMotion.addEventListener("change", onReducedMotionChange);

      /*
       * The gate that makes this canvas free when nobody is looking at it: `pause()` cancels the
       * pending frame, so an off-screen canvas does not run a cheap no-op rAF loop 60 times a
       * second — it does not run at all, and `play()` is the only thing that can start it again.
       * A quarter of the band, not 1%: a barely-peeking canvas is still a full scene, a bloom mip
       * chain and a full-screen composite per paint.
       */
      const intersection = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          visible = entry.isIntersecting;
          if (visible) play();
          else pause();
        },
        { threshold: 0.25, rootMargin: "0px" },
      );
      intersection.observe(stage);

      stage.dataset.ready = "true";
      paint();
      play();

      dispose = () => {
        pause();
        intersection.disconnect();
        resizeObserver.disconnect();
        window.removeEventListener("scroll", onScroll);
        document.removeEventListener("visibilitychange", onVisibility);
        reduceMotion.removeEventListener("change", onReducedMotionChange);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerdown", onPointerMove);
        window.removeEventListener("pointerup", onPointerOff);
        window.removeEventListener("blur", onPointerOff);
        geometry.dispose();
        edges.dispose();
        chrome.dispose();
        neonEdge.geometry.dispose();
        (neonEdge.material as InstanceType<typeof THREE.LineBasicMaterial>).dispose();
        (halo.material as InstanceType<typeof THREE.MeshBasicMaterial>).dispose();
        backdrop.geometry.dispose();
        (backdrop.material as InstanceType<typeof THREE.ShaderMaterial>).dispose();
        envTexture.dispose();
        pmrem.dispose();
        bloom?.dispose?.();
        composer?.dispose();
        renderer.dispose();
        canvas.remove();
      };
    }

    /**
     * Two gates, both required:
     * 1. the window has finished loading, so the canvas never competes with the LCP image;
     * 2. the band is within one viewport of the scroll position.
     *
     * The second gate is what keeps Lighthouse, and any reader who lands and stays at the top, from
     * paying for a scene they cannot see. Measured before this change: 2.1s of blocking time in the
     * frame that creates the WebGL context (software rendering); after it, none.
     */
    let loaded = document.readyState === "complete";
    let near = false;
    let started = false;

    const maybeStart = () => {
      if (started || !loaded || !near) return;
      started = true;
      // A short beat after the gate opens: the first idle frame belongs to the page, not to us.
      window.setTimeout(start, 120);
    };

    const onLoad = () => {
      loaded = true;
      maybeStart();
    };

    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              if (!entries[0]?.isIntersecting) return;
              near = true;
              maybeStart();
              observer?.disconnect();
            },
            /* No margin: the scene starts the moment the band is actually on screen. A margin of one
               viewport looked friendly, but the band sits ~90px below the first screen, so the
               margin always fired on load and the import landed inside the LCP window. */
            { rootMargin: "0px" },
          )
        : null;

    if (observer) observer.observe(stage);
    else near = true;

    if (!loaded) window.addEventListener("load", onLoad, { once: true });
    maybeStart();

    return () => {
      cancelled = true;
      window.removeEventListener("load", onLoad);
      observer?.disconnect();
      dispose?.();
    };
  }, []);

  return <div ref={hostRef} className={styles.canvas} aria-hidden="true" />;
}
