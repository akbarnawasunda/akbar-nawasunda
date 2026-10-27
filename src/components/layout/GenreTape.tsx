import { genres } from "@/config/site";

import styles from "./GenreTape.module.css";

/**
 * Genre tape: a strip of the verified genres, scrolling like a news ticker.
 *
 * The only loop on the site, and a deliberate exception (D-085): it is paused on hover **and** on
 * keyboard focus, and it does not run at all under `prefers-reduced-motion: reduce`. The list is
 * rendered twice — one copy for the eye, one `aria-hidden` for the seam — so a screen reader reads the
 * genres once.
 */
export function GenreTape() {
  return (
    <div className={styles.tape} role="group" aria-label="Genre">
      <div className={styles.viewport}>
        <ul className={styles.track} tabIndex={0} aria-label="Daftar genre">
          {genres.map((genre) => (
            <li key={genre} className={styles.item}>
              {genre}
            </li>
          ))}
        </ul>
        <ul className={styles.track} aria-hidden="true">
          {genres.map((genre) => (
            <li key={`${genre}-echo`} className={styles.item}>
              {genre}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
