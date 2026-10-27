/**
 * The ink plate's offset, and why it is quantised.
 *
 * Round 9 prints every display heading twice: once in ink, once in a colour plate a few pixels off
 * register. `<InkPress />` owns the offset for the whole site and publishes it as two custom
 * properties that every `.ink` element reads through `text-shadow`.
 *
 * `text-shadow` is a **paint** property, which makes the update rate a performance decision, not a
 * taste one. At three decimal places the value changed on every frame of every pointer move — and
 * for another half second afterwards while it eased — so the site's most expensive paint (the
 * hero's 14vw name, roughly two million device pixels of serif drawn twice) was re-executed ~60
 * times a second to express a movement the eye reads as one gesture.
 *
 * Snapping to `1 / PLATE_STEPS`, where `PLATE_STEPS` is the largest plate shift on the site (7 px,
 * the hero), fixes that at the root:
 *
 * - the hero's plate moves in **whole pixels** — fifteen positions across the full sweep instead of
 *   one per frame, so the paint count drops by roughly an order of magnitude;
 * - a plate at a fractional offset is antialiased twice (once for the glyph, once for the shadow at
 *   x.42 px), so whole pixels are also *sharper*;
 * - it is closer to the thing being imitated: a mis-registered plate sits 6 px off, not 6.42.
 *
 * Smaller plates (3–5 px) step by a fraction of a pixel, which is invisible on 10–22 px type and
 * costs nothing to paint.
 */
export const PLATE_STEPS = 7;

/**
 * Snap a normalised offset (−1…1) so that the largest plate lands on an integer pixel.
 *
 * Pure and exported so the invariant can be tested without a browser: see
 * `tests/studio/motion-budget.test.ts`.
 */
export function snapPlate(value: number): number {
  return Math.round(value * PLATE_STEPS) / PLATE_STEPS;
}

/** The offset in px that a plate of `shift` would be painted at, for a given normalised value. */
export function platePx(value: number, shift: number): number {
  return snapPlate(value) * shift;
}
