/**
 * Liquid Signal — dot-matrix signal field (reference 1: particle dot fluid).
 *
 * Meaning (3D_ART_DIRECTION.md): a bass signal that flows, the in-between state of moving from remix
 * culture (DJ Akbar Remix, liquid, unformed) to a solid but still fluid identity (Akbar Nawasunda).
 * It is deliberately NOT a solid glowing sphere: the form is made of dots whose colour is fixed at
 * the edge of the blob (icy #8AE8FF → blue #0087FF → purple #7800FF) over the near-black ground.
 *
 * Implementation for Phase 2 revision: inline SVG (no canvas, no JS cost). `<pattern>` supplies the
 * dot lattice, `<radialGradient>` + `<linearGradient>` colour the dots, a clipped blurred stroke
 * gives the thin inner glow. Motion is CSS-only: breathing 1 → 1.03 over 6s, rotation 0 → 3deg over
 * 20s, both disabled under prefers-reduced-motion.
 *
 * Phase 7 role: this is the permanent static layer, not a placeholder to be deleted. `HeroSignal`
 * renders it on the server and layers the WebGL field on top once the page is idle; whenever the
 * renderer is skipped or gives up — no WebGL, shader failure, <30 fps, prefers-reduced-motion — this
 * SVG is what the visitor sees. Same 600x600 footprint, same layer, same motion as the canvas.
 */
import styles from "./SignalField.module.css";

export type SignalVariant = "dots" | "outline";

interface SignalFieldProps {
  variant?: SignalVariant;
  /** Rendered size in CSS pixels; the viewBox stays 0 0 600 600. */
  size?: number;
  /**
   * Prefix for the SVG ids. Two instances on one page would otherwise share gradient/pattern ids
   * and the second one would inherit the first one's paint.
   */
  idPrefix?: string;
  className?: string;
}

/** Organic, asymmetric contour. Round enough to read as fluid, lumpy enough to avoid a circle. */
const BLOB =
  "M 306 74 C 392 52 468 104 500 176 C 534 252 546 330 492 392 C 438 454 352 512 268 498 " +
  "C 186 484 108 430 88 348 C 68 266 96 172 168 124 C 210 95 254 84 306 74 Z";

export function SignalField({ variant = "dots", size = 600, idPrefix = "signal", className }: SignalFieldProps) {
  const p = idPrefix;
  const classes = className ? `${styles.field} ${className}` : styles.field;

  if (variant === "outline") {
    return (
      <svg
        className={classes}
        viewBox="0 0 600 600"
        width={size}
        height={size}
        aria-hidden="true"
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
        data-signal="outline"
      >
        <defs>
          <linearGradient id={`${p}-outline`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8AE8FF" stopOpacity="0.85" />
            <stop offset="52%" stopColor="#0087FF" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#7800FF" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <g className={styles.breather}>
          <path d={BLOB} fill="#101012" fillOpacity="0.65" />
          <path d={BLOB} fill="none" stroke={`url(#${p}-outline)`} strokeWidth="1.25" />
          <path
            d={BLOB}
            fill="none"
            stroke="#2A2A3A"
            strokeWidth="1"
            strokeOpacity="0.6"
            transform="translate(606 606) rotate(180) scale(0.94)"
          />
        </g>
      </svg>
    );
  }

  return (
    <svg
      className={classes}
      viewBox="0 0 600 600"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      data-signal="dots"
    >
      <defs>
        {/* Colour of the dots: icy highlight at the top edge, signal blue through the body,
            purple where the form falls into shadow (reference 1). */}
        <radialGradient id={`${p}-body`} cx="60%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#8AE8FF" />
          <stop offset="42%" stopColor="#0087FF" />
          <stop offset="100%" stopColor="#7800FF" />
        </radialGradient>
        <linearGradient id={`${p}-edge`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#8AE8FF" />
          <stop offset="55%" stopColor="#0087FF" />
          <stop offset="100%" stopColor="#7800FF" />
        </linearGradient>

        {/* Two dot lattices: fine (1.5px radius, 7px pitch) for the body, coarse (3px, 14px) for
            the depth layer that sits behind it. */}
        <pattern id={`${p}-dots-fine`} width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="3.5" cy="3.5" r="1.5" fill={`url(#${p}-body)`} opacity="0.85" />
        </pattern>
        <pattern id={`${p}-dots-coarse`} width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="3" fill={`url(#${p}-edge)`} opacity="0.4" />
        </pattern>

        <clipPath id={`${p}-clip`}>
          <path d={BLOB} />
        </clipPath>
      </defs>

      <g className={styles.rotor}>
        <g className={styles.breather}>
          {/* Depth layer: larger, fainter dots. */}
          <path d={BLOB} fill={`url(#${p}-dots-coarse)`} opacity="0.55" />

          {/* Body: the fine lattice. */}
          <path d={BLOB} fill={`url(#${p}-dots-fine)`} />

          {/* Edge light without a blur filter: three stacked strokes clipped inside the contour
              (12px at 8%, 5px at 14%, 1px at 55%). Cheaper than feGaussianBlur on low-end Android,
              and it cannot stall a software renderer. */}
          <g clipPath={`url(#${p}-clip)`}>
            <path d={BLOB} fill="none" stroke={`url(#${p}-edge)`} strokeWidth="12" opacity="0.08" />
            <path d={BLOB} fill="none" stroke={`url(#${p}-edge)`} strokeWidth="5" opacity="0.14" />
            <path d={BLOB} fill="none" stroke={`url(#${p}-edge)`} strokeWidth="1" opacity="0.55" />
          </g>
          <path d={BLOB} fill="none" stroke="#2A2A3A" strokeWidth="1" strokeOpacity="0.5" />
        </g>
      </g>
    </svg>
  );
}
