/**
 * WebGL renderer for the Liquid Signal.
 *
 * Loaded through a dynamic import from HeroSignal, so this file — the only part that costs bytes —
 * is not in the initial bundle and cannot delay the LCP image. Everything it needs lives in the two
 * files next to it; there is no graphics library in the dependency tree (see D-050 for the numbers
 * behind that decision).
 */

import {
  CAMERA_DISTANCE,
  FIELD_OF_VIEW,
  QUAD_STRIDE,
  cappedDpr,
  frameState,
  pointBudget,
  sphereQuads,
} from "./geometry";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shaders";

export type LiquidSignalFailure = "context" | "shader" | "slow";

export interface LiquidSignalOptions {
  /** Called once, after the first frame has actually been drawn. */
  onFirstFrame?: () => void;
  /** Called when the field gives up: context failure, shader failure, or a sustained low frame rate. */
  onFail?: (reason: LiquidSignalFailure) => void;
}

export interface LiquidSignalHandle {
  /** Stops the loop, releases GPU objects and the context, removes listeners. Safe to call twice. */
  dispose: () => void;
  /** Pauses the loop without releasing anything (offscreen or hidden tab). */
  setPaused: (paused: boolean) => void;
}

/** Below this average frame rate over the first two seconds, the field steps aside for the SVG. */
const MIN_FPS = 30;
const SAMPLE_MS = 2000;
/** Cap the loop: 50 fps is indistinguishable for a six-second breath and leaves the GPU idle. */
const FRAME_INTERVAL_MS = 1000 / 50;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // The driver's message is the only way to debug a shader on a device you cannot attach to.
    console.error("[liquid-signal] shader compile failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createLiquidSignal(
  canvas: HTMLCanvasElement,
  options: LiquidSignalOptions = {},
): LiquidSignalHandle | null {
  const attributes: WebGLContextAttributes = {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  };

  const gl =
    (canvas.getContext("webgl2", attributes) as WebGL2RenderingContext | null) ??
    (canvas.getContext("webgl", attributes) as WebGLRenderingContext | null) ??
    (canvas.getContext("experimental-webgl", attributes) as WebGLRenderingContext | null);

  if (!gl) {
    options.onFail?.("context");
    return null;
  }

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = vertex && fragment ? gl.createProgram() : null;
  if (!vertex || !fragment || !program) {
    options.onFail?.("shader");
    return null;
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("[liquid-signal] program link failed:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    options.onFail?.("shader");
    return null;
  }

  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  const attribute = (name: string) => gl.getAttribLocation(program, name);
  const uniform = (name: string) => gl.getUniformLocation(program, name);

  const aCentre = attribute("aCentre");
  const aSeed = attribute("aSeed");
  const aCorner = attribute("aCorner");

  const uProjection = uniform("uProjection");
  const uView = uniform("uView");
  const uTime = uniform("uTime");
  const uScale = uniform("uScale");
  const uPointPixels = uniform("uPointPixels");
  const uTanHalfFov = uniform("uTanHalfFov");
  const uCanvasHeight = uniform("uCanvasHeight");
  const uCameraDistance = uniform("uCameraDistance");
  const uOpacity = uniform("uOpacity");

  const stride = QUAD_STRIDE * 4;
  const bindAttributes = () => {
    gl.enableVertexAttribArray(aCentre);
    gl.vertexAttribPointer(aCentre, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aSeed);
    gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(aCorner);
    gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, stride, 16);
  };
  bindAttributes();

  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  gl.disable(gl.DEPTH_TEST);

  let vertexCount = 0;
  let aspect = 1;
  const tanHalfFov = Math.tan(FIELD_OF_VIEW / 2);

  const resize = () => {
    const width = Math.max(1, canvas.clientWidth || canvas.parentElement?.clientWidth || 300);
    const height = Math.max(1, canvas.clientHeight || width);
    const dpr = cappedDpr(window.devicePixelRatio || 1);

    const bufferWidth = Math.round(width * dpr);
    const bufferHeight = Math.round(height * dpr);
    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
    }
    aspect = bufferWidth / bufferHeight;

    // The field is square in the layout, so one dimension drives the point count.
    const count = pointBudget({
      width,
      dpr: window.devicePixelRatio || 1,
      cores: navigator.hardwareConcurrency,
      coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    });
    if (count * 6 !== vertexCount) {
      vertexCount = count * 6;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, sphereQuads(count), gl.STATIC_DRAW);
      bindAttributes();
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  resize();

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  let frame = 0;
  let disposed = false;
  let paused = false;
  let startedAt = 0;
  let lastFrameAt = 0;
  let frames = 0;
  let judged = false;
  let announcedFirstFrame = false;

  const draw = (now: number) => {
    if (disposed) return;
    if (paused) return;
    frame = requestAnimationFrame(draw);

    if (lastFrameAt && now - lastFrameAt < FRAME_INTERVAL_MS - 1) return;
    lastFrameAt = now;

    if (startedAt === 0) startedAt = now;
    const seconds = (now - startedAt) / 1000;

    const uniforms = frameState({ seconds, aspect, canvasHeight: canvas.height });

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniformMatrix4fv(uProjection, false, uniforms.projection);
    gl.uniformMatrix4fv(uView, false, uniforms.view);
    gl.uniform1f(uTime, seconds);
    gl.uniform1f(uScale, uniforms.scale);
    // Dot diameter in device pixels: ~6 px on a 600 px-tall stage, growing with the buffer.
    gl.uniform1f(uPointPixels, uniforms.pointPixels);
    gl.uniform1f(uTanHalfFov, tanHalfFov);
    gl.uniform1f(uCanvasHeight, canvas.height);
    gl.uniform1f(uCameraDistance, CAMERA_DISTANCE);
    gl.uniform1f(uOpacity, 0.92);
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);

    if (!announcedFirstFrame) {
      announcedFirstFrame = true;
      options.onFirstFrame?.();
    }

    // Frame-rate governor: if the first two seconds average below MIN_FPS, hand back to the SVG.
    if (!judged) {
      frames += 1;
      const elapsed = now - startedAt;
      if (elapsed >= SAMPLE_MS) {
        judged = true;
        const fps = (frames / elapsed) * 1000;
        if (fps < MIN_FPS) {
          console.warn(`[liquid-signal] ${Math.round(fps)} fps, reverting to the static field`);
          dispose();
          options.onFail?.("slow");
        }
      }
    }
  };

  const start = () => {
    if (disposed || paused || frame !== 0) return;
    frame = requestAnimationFrame(draw);
  };

  const stop = () => {
    if (frame !== 0) cancelAnimationFrame(frame);
    frame = 0;
  };

  const setPaused = (next: boolean) => {
    paused = next;
    if (paused) stop();
    else start();
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    observer.disconnect();
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.deleteBuffer(buffer);
    gl.useProgram(null);
    gl.deleteProgram(program);
    // Ask the driver to drop the context now rather than whenever it feels like it: a phone with a
    // handful of live contexts starts discarding the oldest ones, and that would take the rest of
    // the page down with it.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };

  frame = requestAnimationFrame(draw);

  return { dispose, setPaused };
}
