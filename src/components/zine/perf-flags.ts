/**
 * Diagnostic switches for the round-11 performance work.
 *
 * The problem this solves is attribution. Round 11 changed six things at once, which makes it
 * impossible to say *which* change bought the frames — and a performance claim you cannot attribute
 * is not an engineering result, it is a hope. Four suspects were named: the header's backdrop blur,
 * the hero plate's pointer rotation, the ink plate's `text-shadow`, and the WebGL monogram.
 *
 * `?perf=` turns any combination of them off (or, for the blur, back on) at runtime, so the ablation
 * can be run against a single build:
 *
 *   /?perf=noplate          the hero does not rotate towards the pointer
 *   /?perf=noink            the colour plate does not follow the pointer
 *   (round 20 retired `nocanvas` with its subject: the monogram is a baked still now, so there is
 *   no scene left to ablate — the question "what does the canvas cost" has a permanent answer of 0)
 *   /?perf=blur             the header's backdrop blur is restored (it ships removed)
 *   /?perf=noplate,noink    combine as many as you like
 *
 * `npm run perf:audit -- --ablation` drives all of these in one run and prints the matrix.
 *
 * This is a *diagnostic*, not a feature: nothing changes without the query parameter, the code is a
 * few lines, and it can be deleted the moment the numbers are in. It exists because the alternative
 * is guessing — and the last two rounds of this project were spent learning that guessing about
 * rendering is reliably wrong.
 */
export const PERF_FLAGS = ["blur", "noplate", "noink"] as const;

export type PerfFlag = (typeof PERF_FLAGS)[number];

/**
 * Parse `?perf=` out of a query string. Repeatable and comma-separated, unknown values ignored, so a
 * typo in a URL measures the baseline instead of silently measuring something else.
 */
export function parsePerfFlags(search: string): Set<PerfFlag> {
  const flags = new Set<PerfFlag>();
  if (!search) return flags;
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  for (const raw of params.getAll("perf")) {
    for (const part of raw.split(",")) {
      const value = part.trim();
      if ((PERF_FLAGS as readonly string[]).includes(value)) flags.add(value as PerfFlag);
    }
  }
  return flags;
}

/**
 * Is this switch on? Read once per page and cached: the query string cannot change without a
 * navigation, and the callers are effects that mount long after it was parsed.
 */
let cached: Set<PerfFlag> | null = null;

export function perfFlag(flag: PerfFlag): boolean {
  if (typeof window === "undefined") return false;
  cached ??= parsePerfFlags(window.location.search);
  return cached.has(flag);
}

/** The active switches, space-separated, for `document.documentElement.dataset.perf`. */
export function activePerfFlags(): string {
  if (typeof window === "undefined") return "";
  cached ??= parsePerfFlags(window.location.search);
  return [...cached].join(" ");
}
