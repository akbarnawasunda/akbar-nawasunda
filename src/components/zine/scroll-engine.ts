/**
 * One scroll loop for the whole site.
 *
 * Why this exists at all: the previous pass drove every scroll effect with CSS scroll timelines
 * (`animation-timeline: view()`). Those run on the compositor and cost nothing — but they only exist
 * in Chromium 115+. Safari shipped them in 26, which means **every iPhone before iOS 26 saw a
 * completely static page**, and the owner's report was exactly that: "ga ada animasi". A site whose
 * motion only exists in one engine is a site with no motion.
 *
 * So the loop is JavaScript, and it is written the way a senior would write it after being burned:
 *
 * - **one** rAF loop and **one** passive scroll listener for the entire page, no matter how many
 *   elements subscribe;
 * - all geometry is read in one batch *before* any style is written, so a frame can never cause
 *   layout thrash (read → write → read → write is the classic 60 fps killer);
 * - it only computes when the scroll position, viewport, or registry actually changed;
 * - it writes `transform` and `opacity` only, both compositor-friendly;
 * - subscribers below the fold and above the viewport are still updated but skipped by an early
 *   cost check (a rect read is cheap; the transform write is what we gate).
 * - `prefers-reduced-motion: reduce` never registers anything at all: the markup renders in its
 *   resting state, which is the only correct fallback (the animation must not be the thing that
 *   makes content readable).
 */

export interface DepthOptions {
  /** Vertical travel in px across the element's full pass through the viewport. + follows the scroll. */
  y?: number;
  /** Horizontal drift in px, same scale. Useful for offsetting a panel against its neighbours. */
  x?: number;
  /** Degrees of rotateX as the element enters the viewport. The 3D part. */
  rotateX?: number;
  /** Degrees of rotateY, for a card that turns slightly toward the centre line. */
  rotateY?: number;
  /** Extra depth in px, applied with the parent's `perspective`. Positive moves toward the reader. */
  z?: number;
  /** Scale delta at the extremes, e.g. 0.04 → 1.04 when centred. */
  scale?: number;
  /** Fade at the extremes; 0 disables the opacity write entirely (cheaper). */
  fade?: number;
  /** Element that provides the perspective for `z`/`rotateX`. Defaults to the node itself. */
  perspective?: number;
}

interface Entry extends Required<Omit<DepthOptions, "perspective">> {
  node: HTMLElement;
  perspective: number;
  active: boolean;
}

const entries = new Set<Entry>();
let frame = 0;
let listening = false;
let lastKey = "";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function reduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function tick() {
  frame = 0;
  const vh = window.innerHeight || 1;

  // Read pass — one rect per subscriber, no interleaved writes.
  const measured: { entry: Entry; progress: number }[] = [];
  for (const entry of entries) {
    const rect = entry.node.getBoundingClientRect();
    // -1 when the element sits just below the viewport, 0 at centre, +1 once it has left the top.
    const span = (vh + rect.height) / 2;
    const centre = rect.top + rect.height / 2;
    const progress = clamp((centre - vh / 2) / span, -1, 1);
    measured.push({ entry, progress });
  }

  // Write pass.
  for (const { entry, progress } of measured) {
    const { node } = entry;
    const distance = progress * -1; // +1 below the fold, -1 above it
    const parts: string[] = [];

    if (entry.perspective > 0) parts.push(`perspective(${entry.perspective}px)`);

    const ty = progress * entry.y;
    const tx = progress * entry.x;
    const tz = distance * entry.z;
    if (ty || tx || tz) parts.push(`translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, ${tz.toFixed(2)}px)`);

    if (entry.scale) {
      const factor = 1 + entry.scale * (1 - Math.abs(progress));
      parts.push(`scale(${factor.toFixed(4)})`);
    }
    if (entry.rotateX) parts.push(`rotateX(${(distance * entry.rotateX).toFixed(2)}deg)`);
    if (entry.rotateY) parts.push(`rotateY(${(progress * entry.rotateY).toFixed(2)}deg)`);

    node.style.transform = parts.length ? parts.join(" ") : "";
    if (entry.fade) node.style.opacity = String(clamp(1 - Math.abs(progress) * entry.fade, 0, 1).toFixed(3));
  }
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(tick);
}

function onScroll() {
  // A cheap guard: identical scroll offsets (Lenis writes sub-pixel values) still get one frame.
  const key = `${window.scrollY}:${window.innerWidth}x${window.innerHeight}`;
  if (key === lastKey) return;
  lastKey = key;
  schedule();
}

function start() {
  if (listening) return;
  listening = true;
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  schedule();
}

function stop() {
  if (!listening) return;
  listening = false;
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onScroll);
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  lastKey = "";
}

/**
 * Register an element. Returns an unsubscribe function, which is what a React effect needs.
 * No-op (and no listener) when the reader asked for reduced motion.
 */
export function registerDepth(node: HTMLElement, options: DepthOptions = {}): () => void {
  if (typeof window === "undefined") return () => {};
  if (reduced()) return () => {};

  const entry: Entry = {
    node,
    y: options.y ?? 0,
    x: options.x ?? 0,
    rotateX: options.rotateX ?? 0,
    rotateY: options.rotateY ?? 0,
    z: options.z ?? 0,
    scale: options.scale ?? 0,
    fade: options.fade ?? 0,
    perspective: options.perspective ?? 0,
    active: true,
  };

  entries.add(entry);
  start();
  schedule();

  return () => {
    entries.delete(entry);
    node.style.transform = "";
    node.style.opacity = "";
    if (entries.size === 0) stop();
  };
}

/**
 * Force a re-measure. Pages register in an effect, which runs after layout, so this is mostly for
 * content that grows after mount (images finishing decode, the Studio preview hot-swapping a page).
 */
export function refreshDepth() {
  lastKey = "";
  schedule();
}
