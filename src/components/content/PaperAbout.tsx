import { artistLongBio, artistTimeline } from "@/content/artist";
import { siteConfig } from "@/config/site";

import styles from "./PaperAbout.module.css";

/**
 * About, printed on stock: an off-white sheet laid over the dark site, with the
 * timeline as a drawn line rather than a set of boxes.
 *
 * The line is one SVG path whose `stroke-dashoffset` is animated by a CSS scroll timeline, so it is
 * drawn by the compositor as the band comes up and costs nothing on the main thread. Without scroll
 * timelines the path is simply already drawn (see the `@supports` guard in the CSS), which is the
 * only correct fallback: an invisible timeline is worse than no animation.
 *
 * Copy is the owner's own biography, verbatim, plus the verified timeline. The 2021–2023 row stays
 * dashed and says it is not documented — a gap printed honestly reads as confidence; an invented
 * milestone reads as a template.
 */
export function PaperAbout() {
  return (
    <section className={styles.paper} aria-labelledby="about-title" id="about">

      <div className={styles.inner}>
        <p className={styles.kicker}>01 — Tentang</p>

        <div className={styles.grid}>
          <h2 id="about-title" className={styles.heading}>
            Dari kamar di Bandung Barat ke katalog digital.
          </h2>

          <div className={styles.body}>
            <p className={styles.lead}>{artistLongBio}</p>
            <p className={styles.meta}>
              {siteConfig.origin} · aktif sejak {siteConfig.since} · nama panggung Akbar Nawasunda
            </p>
          </div>
        </div>

        <ol className={styles.timeline}>
          <svg
            className={styles.rail}
            viewBox="0 0 1000 12"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <path className={styles.railBase} d="M2 6H998" />
            <path
              className={styles.railInk}
              d="M2 6H998"
              pathLength={1}
            />
          </svg>

          {artistTimeline.map((entry) => (
            <li
              key={entry.marker}
              className={entry.pending ? `${styles.stop} ${styles.pending}` : styles.stop}
            >
              <span className={styles.year}>{entry.marker}</span>
              <span className={styles.title}>{entry.title}</span>
              <span className={styles.detail}>{entry.detail}</span>
              {entry.pending ? <span className={styles.flag}>[NEEDS OWNER]</span> : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
