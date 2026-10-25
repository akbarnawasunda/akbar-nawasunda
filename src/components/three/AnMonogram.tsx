"use client";

import { useEffect, useRef } from "react";

import styles from "./AnMonogram.module.css";
import { perfFlag } from "../zine/perf-flags";

/**
 * The one canvas on the site: the AN monogram, extruded from the owner's real mark.
 *
 * What it is not: a particle field, a bloom pass, a displaced blob or a full-screen scene. It is a
 * single extrusion of the logo's own silhouette (traced offline by scripts/build-an-shape.mjs) with
 * a metal material and a thin blue wireframe on top — D-095.
 *
 * Cost control, in order of importance:
 * - nothing is imported until the page has loaded *and* the band is within one screen of the
 *   viewport, so the bundle, the shader compile and the env-map pass all land after LCP — and on a
 *   page nobody has scrolled yet, they never land at all;
 * - **nothing mounts at all below 768 px** (R12): a phone gets the band without the renderer;
 * - the loop stops when the canvas leaves the viewport or the tab is hidden;
 * - **the scene is painted at 30 fps, not 60** (R11). What moves here is a 5.2 s sine on one axis
 *   with an amplitude of 0.22 rad — at 30 fps that is ~1.3° of motion per paint, which is below the
 *   threshold where the eye reads stepping, while the frame cost halves. The freed frames are the
 *   point: this canvas shares a main thread and a GPU queue with the hero's plate, the ink plate and
 *   Lenis, and it is the only one of the four that is a full scene;
 * - it only paints once a quarter of the band is on screen, because a scene that is 1% visible is
 *   still a full render of a mesh, an env map and a wireframe;
 * - `MeshStandardMaterial`, not `MeshPhysicalMaterial`: the clearcoat lobe this used to carry is a
 *   second specular evaluation on every fragment for a difference nobody can see on a 300 px metal
 *   mark. Metalness, roughness and the room env map — the parts that actually read as metal — stay;
 * - devicePixelRatio is capped at 1.25; the canvas is decorative, not a photo;
 * - `prefers-reduced-motion: reduce` renders one frame and never starts the loop;
 * - WebGL failure is silent: the hero is designed to be complete without it.
 */
export function AnMonogram() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    /* Ablation switch: `?perf=nocanvas` never imports three.js, so the scene cannot be measured
       against the rest of the page while it is also running. */
    if (perfFlag("nocanvas")) return;
    /*
     * No scene on a phone (R12).
     *
     * The mark is 300 px of decorative metal behind the signature band. On a phone it is cropped to
     * a third of its width, sits under a full-width heading, and costs the three things a mid-range
     * Android has least of: a WebGL context, a megabyte of texture memory, and a repeat paint every
     * 33 ms on the same main thread that is running Lenis and the plate. The band is designed to be
     * complete without it — the heading, the rules and the plate are the whole composition — so on a
     * small screen it simply does not mount, and the GPU is never touched at all.
     *
     * The gate is a media query read once at mount, deliberately: this is not a pointer hint (which
     * would be `pointerType`), it is a decision about whether to allocate a renderer on a device we
     * are not going to show it to.
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
      const [THREE, { RoomEnvironment }, { anShape }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/environments/RoomEnvironment.js"),
        import("@/assets/an-shape"),
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
          /* No MSAA: the mark is a handful of straight edges, and the wireframe overlay already
             defines them. Antialiasing here doubled the fragment cost for no visible gain. */
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
        });
      } catch {
        return;
      }
      stage.appendChild(canvas);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      renderer.setClearAlpha(0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(0, 0, 3.1);

      // Reflections for the metal without shipping an HDR file.
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTexture;

      scene.add(new THREE.AmbientLight(0xffffff, 0.35));
      const key = new THREE.DirectionalLight(0xdfe7ff, 2.2);
      key.position.set(-2.4, 2.8, 3.2);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x2e8c86, 2.6);
      rim.position.set(3.2, -1.4, 1.4);
      scene.add(rim);

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
        depth: 0.16,
        bevelEnabled: true,
        bevelThickness: 0.018,
        bevelSize: 0.012,
        bevelSegments: 3,
        curveSegments: 1,
      });
      geometry.center();
      geometry.computeVertexNormals();

      /*
       * Standard, not Physical. The clearcoat this used to carry costs a second specular lobe per
       * fragment and reads as nothing at this size; metalness + roughness + the RoomEnvironment
       * reflection is where all of the visible metal comes from.
       */
      const metal = new THREE.MeshStandardMaterial({
        color: 0xe8e6e1,
        metalness: 0.92,
        roughness: 0.16,
        emissive: new THREE.Color(0x2e8c86),
        emissiveIntensity: 0.06,
        envMapIntensity: 1.15,
      });

      const mesh = new THREE.Mesh(geometry, metal);
      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 24),
        new THREE.LineBasicMaterial({ color: 0x2e8c86, transparent: true, opacity: 0.38 }),
      );
      wire.scale.setScalar(1.004);

      const group = new THREE.Group();
      group.add(mesh, wire);
      group.rotation.set(-0.08, -0.5, 0.03);
      // The mark is wider than tall; fit the long side to the frame and keep its aspect.
      const fit = 1.75;
      const baseScale = fit;
      group.scale.setScalar(baseScale);
      scene.add(group);

      /**
       * Composition, not a background: the mark sits behind the portrait on wide screens and drifts
       * to the centre behind the stacked hero on a phone. The offset is read from the layout, so the
       * scene never guesses where the portrait is.
       */
      const placeGroup = () => {
        const wide = window.matchMedia("(min-width: 1024px)").matches;
        // Half the frame is ~1.35 world units wide at this camera distance; 0.5 keeps the mark
        // inside the right column, behind the portrait, and clear of the copy.
        group.position.x = wide ? 0.46 : 0.0;
        group.position.y = wide ? 0.02 : 0.1;
        group.userData.baseY = group.position.y;
      };
      placeGroup();

      // --- sizing
      const resize = () => {
        const { clientWidth, clientHeight } = stage;
        if (clientWidth === 0 || clientHeight === 0) return;
        renderer.setSize(clientWidth, clientHeight, false);
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
        placeGroup();
      };
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
      const base = baseScale;

      /**
       * One paint every other vsync. The rAF callback stays on 60 Hz — it is a scheduler, not a
       * renderer — so the phase of the oscillation stays tied to wall-clock time and nothing drifts
       * when the tab throttles.
       */
      const FRAME_MS = 1000 / 30;
      let paintedAt = 0;

      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (now - paintedAt < FRAME_MS - 1) return;
        paintedAt = now;
        if (!reduceMotion.matches) {
          // Oscillation around a readable three-quarter view, not a continuous spin: a full
          // rotation puts the mark edge-on twice a minute, and an edge-on monogram is a white slab.
          group.rotation.y = -0.28 + Math.sin(now / 5200) * 0.22;
          group.rotation.x = -0.05 + Math.sin(now / 2600) * 0.03;
          group.position.y = (group.userData.baseY ?? 0) + Math.sin(now / 1800) * 0.02;
        }
        const eased = 1 - Math.pow(1 - scrollProgress, 3);
        const target = base * (1 + eased * 0.55);
        /* 0.15, not 0.08: the lerp runs at 30 fps now, and the time constant is what the eye sees.
           0.08 at 60 fps and 0.1536 at 30 fps are the same curve; using 0.08 here would have made
           the mark reach its scroll size twice as slowly as it used to. */
        group.scale.setScalar(group.scale.x + (target - group.scale.x) * 0.15);
        group.rotation.z = 0.03 - eased * 0.06;
        renderer.render(scene, camera);
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
          renderer.render(scene, camera);
        } else {
          play();
        }
      };
      reduceMotion.addEventListener("change", onReducedMotionChange);

      const intersection = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          visible = entry.isIntersecting;
          if (visible) play();
          else pause();
        },
        /* A quarter of the band, not 1%: a barely-peeking canvas is still a full scene per paint. */
        { threshold: 0.25 },
      );
      intersection.observe(stage);

      stage.dataset.ready = "true";
      renderer.render(scene, camera);
      play();

      dispose = () => {
        pause();
        intersection.disconnect();
        resizeObserver.disconnect();
        window.removeEventListener("scroll", onScroll);
        document.removeEventListener("visibilitychange", onVisibility);
        reduceMotion.removeEventListener("change", onReducedMotionChange);
        geometry.dispose();
        metal.dispose();
        wire.geometry.dispose();
        (wire.material as InstanceType<typeof THREE.LineBasicMaterial>).dispose();
        envTexture.dispose();
        pmrem.dispose();
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
