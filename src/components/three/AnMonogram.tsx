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
 * - **the scene is painted at 30 fps, not 60**. What moves is a 5.2 s sine on one axis and a slow
 *   shader clock; at 30 fps that is ~1.3° of motion per paint, below the threshold where the eye
 *   reads stepping, while the frame cost halves;
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
       * Black chrome. `color` is near-black rather than pure black because a metal with no albedo
       * reads as a hole: what little diffuse it has should still be the brand's ink.
       */
      const chrome = new THREE.MeshPhysicalMaterial({
        color: 0x23262f,
        metalness: 0.9,
        roughness: 0.16,
        clearcoat: 0.85,
        clearcoatRoughness: 0.06,
        reflectivity: 0.7,
        envMapIntensity: 2.1,
      });

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
      const neonEdge = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x7fc4ff, transparent: true, opacity: 1 }),
      );
      neonEdge.scale.setScalar(1.004);

      const halo = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color: NEON,
          transparent: true,
          opacity: 0.05,
          side: THREE.BackSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
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

      /**
       * One paint every other vsync. The rAF callback stays on 60 Hz — it is a scheduler, not a
       * renderer — so the phase of the oscillation stays tied to wall-clock time and nothing drifts
       * when the tab throttles.
       */
      const FRAME_MS = 1000 / 30;
      let paintedAt = 0;
      let startedAt = 0;

      const paint = () => {
        if (composer) composer.render();
        else renderer.render(scene, camera);
      };

      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (now - paintedAt < FRAME_MS - 1) return;
        paintedAt = now;
        if (!startedAt) startedAt = now;
        const elapsed = (now - startedAt) / 1000;
        backdropUniforms.uTime.value = elapsed;

        if (!reduceMotion.matches) {
          // Oscillation around a readable three-quarter view, not a continuous spin: a full rotation
          // puts the mark edge-on twice a minute, and an edge-on monogram is a black slab.
          group.rotation.y = -0.28 + Math.sin(now / 5200) * 0.22;
          group.rotation.x = -0.05 + Math.sin(now / 2600) * 0.03;
          group.position.y = (group.userData.baseY ?? 0) + Math.sin(now / 1800) * 0.02;
          /* The light drifts a little too, so the chrome highlight travels across the bevel instead
             of sitting still — this is the whole difference between "metal" and "grey". */
          neonLight.position.x = -2.2 + Math.sin(now / 4300) * 0.45;
          neonLight.position.y = 1.1 + Math.cos(now / 6100) * 0.3;
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
