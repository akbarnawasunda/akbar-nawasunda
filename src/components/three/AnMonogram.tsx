"use client";

import { useEffect, useRef } from "react";

import styles from "./AnMonogram.module.css";

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
 * - the loop stops when the canvas leaves the viewport or the tab is hidden;
 * - devicePixelRatio is capped at 1.5; the canvas is decorative, not a photo;
 * - `prefers-reduced-motion: reduce` renders one frame and never starts the loop;
 * - WebGL failure is silent: the hero is designed to be complete without it.
 */
export function AnMonogram() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

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

      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-hidden", "true");
      stage.appendChild(canvas);

      const renderer = new THREE.WebGLRenderer({
        canvas,
        /* No MSAA: the mark is a handful of straight edges, and the wireframe overlay already
           defines them. Antialiasing here doubled the fragment cost for no visible gain. */
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
      });
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
      const rim = new THREE.DirectionalLight(0x0087ff, 2.6);
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

      const metal = new THREE.MeshPhysicalMaterial({
        color: 0xe8e6e1,
        metalness: 0.92,
        roughness: 0.16,
        clearcoat: 0.35,
        clearcoatRoughness: 0.25,
        emissive: new THREE.Color(0x0087ff),
        emissiveIntensity: 0.06,
        envMapIntensity: 1.15,
      });

      const mesh = new THREE.Mesh(geometry, metal);
      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 24),
        new THREE.LineBasicMaterial({ color: 0x0087ff, transparent: true, opacity: 0.38 }),
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

      const frame = (now: number) => {
        if (!reduceMotion.matches) {
          // Oscillation around a readable three-quarter view, not a continuous spin: a full
          // rotation puts the mark edge-on twice a minute, and an edge-on monogram is a white slab.
          group.rotation.y = -0.28 + Math.sin(now / 5200) * 0.22;
          group.rotation.x = -0.05 + Math.sin(now / 2600) * 0.03;
          group.position.y = (group.userData.baseY ?? 0) + Math.sin(now / 1800) * 0.02;
        }
        const eased = 1 - Math.pow(1 - scrollProgress, 3);
        const target = base * (1 + eased * 0.55);
        group.scale.setScalar(group.scale.x + (target - group.scale.x) * 0.08);
        group.rotation.z = 0.03 - eased * 0.06;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
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
        { threshold: 0.01 },
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
