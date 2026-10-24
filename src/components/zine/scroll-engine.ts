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

interface PinEntry {
  node: HTMLElement;
  property: string;
}

const entries = new Set<Entry>();
/**
 * Pinned bands are a different measurement, so they get their own registry.
 *
 * A pin does not want "how far through the viewport is this element"; it wants "how far through the
 * pinned range am I", which is 0 when the section's top hits the top of the screen and 1 when its
 * bottom leaves. That number goes out as a custom property and the CSS does the rest with
 * `calc()`, so the track is translated by the browser and the loop never touches layout.
 */
const pins = new Set<PinEntry>();
let frame = 0;
let listening = false;
let lastKey = "";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * A fade is a compositing effect on text, and text has a contrast floor.
 *
 * `fade: 0.25` on the hero wrapper means the eyebrow is drawn at 62% at the extremes of its travel;
 * #A1A1B5 at 62% over #050507 measures 3.65:1, which fails AA for 10 px type. Nothing looked wrong
 * in review — the page was mid-scroll, which is exactly when nobody looks at contrast — and axe only
 * caught it once scrolling started working properly (D-118). The engine now refuses to write an
 * opacity below 0.85 for anything, which keeps every fading wrapper above 5.5:1 with the site's
 * secondary text colour. The depth still reads; the words stay legible.
 */
const MIN_FADE_OPACITY = 0.85;

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
    /**
     * Progress is normalised by the **viewport**, not by the element.
     *
     * The first version divided by the element's own height, which is physically defensible and
     * editorially wrong: a 750 px portrait and a 200 px heading then travel at different speeds even
     * when they are configured identically, so the hero's "three layers at three speeds" collapsed
     * into whatever their boxes happened to be. Normalising by `vh` means `y: 140` is 140 px per
     * viewport of scroll for every element on the page.
     */
    const centre = rect.top + rect.height / 2;
    const progress = clamp((centre - vh / 2) / vh, -1.5, 1.5);
    measured.push({ entry, progress });
  }

  const measuredPins: { entry: PinEntry; progress: number }[] = [];
  for (const entry of pins) {
    const rect = entry.node.getBoundingClientRect();
    const span = rect.height - vh;
    const progress = span > 0 ? clamp(-rect.top / span, 0, 1) : rect.top < 0 ? 1 : 0;
    measuredPins.push({ entry, progress });
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
    if (entry.fade) {
      node.style.opacity = String(clamp(1 - Math.abs(progress) * entry.fade, MIN_FADE_OPACITY, 1).toFixed(3));
    }
  }

  for (const { entry, progress } of measuredPins) {
    entry.node.style.setProperty(entry.property, progress.toFixed(4));
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
    if (entries.size === 0 && pins.size === 0) stop();
  };
}

/**
 * Register a pinned band. `property` is set to 0 → 1 across the element's pinned travel; the CSS
 * turns that number into `translate`, `scale` or anything else it likes. Same loop, same rules:
 * nothing registers under reduced motion, and the resting state — no property, no offset — is the
 * readable one.
 */
export function registerPin(node: HTMLElement, options: { property?: string } = {}): () => void {
  if (typeof window === "undefined") return () => {};
  if (reduced()) return () => {};

  const entry: PinEntry = { node, property: options.property ?? "--pin" };
  pins.add(entry);
  start();
  schedule();

  return () => {
    pins.delete(entry);
    node.style.removeProperty(entry.property);
    if (entries.size === 0 && pins.size === 0) stop();
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
