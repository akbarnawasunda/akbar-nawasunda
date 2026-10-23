import { genres } from "@/config/site";

import styles from "./GenreTape.module.css";

/**
 * Genre tape: the verified genres in a rules-bounded strip between hero and catalogue.
 *
 * Static, not an infinite marquee (MOTION_DESIGN.md: no endless parallax, no endless particle).
 * Below 720px the strip scrolls horizontally so the words keep their mono spacing instead of
 * wrapping into a ragged block.
 */
export function GenreTape() {
  return (
    // The <ul> is the element that actually scrolls below 720px, so it is the one that needs to be
    // focusable — a scroll container that cannot take focus is unreachable by keyboard
    // (axe: scrollable-region-focusable).
    <div className={styles.tape} role="group" aria-label="Genre">
      <ul className={styles.track} tabIndex={0}>
        {genres.map((genre) => (
          <li key={genre} className={styles.item}>
            {genre}
          </li>
        ))}
      </ul>
    </div>
  );
}
