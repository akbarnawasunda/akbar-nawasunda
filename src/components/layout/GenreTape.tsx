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
    <div className={styles.tape} aria-label="Genre">
      <ul className={styles.track}>
        {genres.map((genre) => (
          <li key={genre} className={styles.item}>
            {genre}
          </li>
        ))}
      </ul>
    </div>
  );
}
