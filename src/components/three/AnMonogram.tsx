"use client";

import { useEffect, useRef } from "react";

import styles from "./AnMonogram.module.css";
import { perfFlag } from "../zine/perf-flags";

/**
 * The one canvas on the site: the AN monogram, extruded from the owner's real mark.
 *
 * What it is not: a particle field, a bloom pass, a displaced blob or a full-screen scene. It is a
 * single extrusion of the logo's own silhouette (traced offline by scripts/build-an-shape.mjs),
 * printed in flat ink — round 13, "SALAH CETAK".
 *
 * **No metal, no environment, no lights.** Until this round the mark was a chrome object: a PMREM
 * room environment, metalness 0.92, roughness 0.16, two directional lights and ACES tone mapping.
 * It looked expensive and it looked like every other 3D logo on the internet — an iron badge glued
 * to a site that had just become a printed sheet. A zine does not reflect its surroundings. So the
 * material is now two flat inks with no shading model at all: `MeshBasicMaterial` on the front and
 * back caps (press cyan), a darker flat cyan on the extruded walls so the form still reads as a
 * solid, a paper-coloured edge on every silhouette, and a second edge offset a few thousandths of a
 * unit in poster red — the same two-plate misregistration the headings print with. It reads as a
 * shape cut out of paper and stamped twice, not as a render.
 *
 * Cost control, in order of importance:
 * - nothing is imported until the page has loaded *and* the band is within one screen of the
 *   viewport, so the bundle, the shader compile and the env-map pass all land after LCP — and on a
 *   page nobody has scrolled yet, they never land at all;
 * - **nothing mounts at all below 768 px** (R12): a phone gets the band without the renderer;
 * - **the loop is cancelled, not throttled, when the canvas leaves the viewport** (round 13): an
 *   `IntersectionObserver` at 0.25 threshold cancels the pending `requestAnimationFrame`, so a
 *   canvas that is off-screen costs zero frames and zero GPU work — not 30 fps of nothing;
 * - **devicePixelRatio is capped at 1** (round 13). The mark is a flat silhouette with straight
 *   edges; above 1 every extra device pixel is four times the fragment cost for an edge that is
 *   already drawn by the line segments;
 * - **the scene is painted at 30 fps, not 60** (R11). What moves here is a 5.2 s sine on one axis
 *   with an amplitude of 0.22 rad — at 30 fps that is ~1.3° of motion per paint, which is below the
 *   threshold where the eye reads stepping, while the frame cost halves;
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
     * The mark is 300 px of decorative ink behind the signature band. On a phone it is cropped to
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
      const [THREE, { anShape }] = await Promise.all([import("three"), import("@/assets/an-shape")]);
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
      /*
       * Capped at 1, not 1.25 (round 13). The mark is flat ink with straight edges: at 2x it is four
       * times the fragments to describe the same silhouette, and the paper edge drawn on top of it
       * is what the eye actually reads the form from.
       */
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
      renderer.setClearAlpha(0);
      /*
       * No tone mapping. ACES existed to keep a metal highlight from clipping; flat ink must be the
       * exact colour the design system specifies, or the print palette stops matching the page.
       */
      renderer.toneMapping = THREE.NoToneMapping;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(0, 0, 3.1);
      /*
       * No scene.environment, no ambient, no key light, no rim light (round 13). MeshBasicMaterial
       * ignores all of them; keeping them would only be a PMREM render pass and three uniform
       * uploads per frame to light nothing.
       */

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
      /* No computeVertexNormals: nothing in this scene is lit, and a normal attribute would be a
         vertex buffer the GPU never reads. */

      /*
       * Two flat inks and two drawn edges. ExtrudeGeometry puts the caps in group 0 and the walls in
       * group 1, which is exactly the pair of tones a two-colour print gives a solid: the same ink
       * on the face, a darker mix on the return.
       */
      const INK_CYAN = 0x2e8c86;
      const INK_RED = 0xc93a22;
      const PAPER = 0xe8e6e1;

      const face = new THREE.MeshBasicMaterial({ color: INK_CYAN });
      const wall = new THREE.MeshBasicMaterial({
        color: new THREE.Color(INK_CYAN).multiplyScalar(0.55).getHex(),
      });

      const mesh = new THREE.Mesh(geometry, [face, wall]);

      /*
       * The paper plate: every silhouette edge in stock colour, then the same edges stamped again a
       * hair to the right in poster red. That second, offset plate is the site's misregistration
       * device — `.ink` does it to every display word — and it is what makes the object read as
       * printed twice rather than rendered once.
       */
      const edges = new THREE.EdgesGeometry(geometry, 24);
      const edgePaper = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: PAPER, transparent: true, opacity: 0.5 }),
      );
      edgePaper.scale.setScalar(1.004);

      const edgeRed = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: INK_RED, transparent: true, opacity: 0.55 }),
      );
      edgeRed.scale.setScalar(1.004);
      edgeRed.position.set(0.012, -0.008, -0.004);

      const group = new THREE.Group();
      group.add(mesh, edgePaper, edgeRed);
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

      /*
       * The gate that makes this canvas free when nobody is looking at it (round 13).
       *
       * `pause()` cancels the pending frame, so an off-screen canvas does not run a cheap no-op rAF
       * loop 60 times a second — it does not run at all, and `play()` is the only thing that can
       * start it again. A quarter of the band, not 1%: a barely-peeking canvas is still a full
       * scene per paint, and on a page where the band is 300 px in a 900 px viewport the threshold
       * is reached only when the object is genuinely in frame.
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
        edges.dispose();
        face.dispose();
        wall.dispose();
        (edgePaper.material as InstanceType<typeof THREE.LineBasicMaterial>).dispose();
        (edgeRed.material as InstanceType<typeof THREE.LineBasicMaterial>).dispose();
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
