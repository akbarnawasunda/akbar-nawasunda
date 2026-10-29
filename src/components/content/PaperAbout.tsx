import { DrawOnView } from "@/components/zine/DrawOnView";
import { artistLongBio, artistTimeline } from "@/content/artist";
import { siteConfig } from "@/config/site";

import styles from "./PaperAbout.module.css";

/**
 * About, printed on stock: an off-white sheet laid over the dark site, with the
 * timeline as a drawn line rather than a set of boxes.
 *
 * The line is one SVG path that draws itself the first time the band is seen. The trigger is an
 * IntersectionObserver (`DrawOnView`), not a CSS scroll timeline: view timelines are Chromium-only,
 * which meant the one animated moment on this sheet did not exist on Safari or Firefox. The path is
 * already drawn when the observer never fires, so the fallback is the finished state.
 *
 * Copy is the owner's own biography, verbatim, plus the verified timeline. The 2021–2023 row stays
 * dashed and says it is not documented — a gap printed honestly reads as confidence; an invented
 * milestone reads as a template.
 */
export function PaperAbout() {
  return (
    <section className={styles.paper} aria-labelledby="about-title" id="about">

      <div className={styles.inner}>
        <p className={styles.kicker}>Tentang</p>

        <div className={styles.grid}>
          <h2 id="about-title" className={styles.heading}>
            Dari kamar di Bandung Barat ke katalog digital.
          </h2>

          <div className={styles.body}>
            {/* `data-copy-origin` marks the artist's own text. Read by scripts/qa-copy.mjs and
                tests/studio/copy-voice.test.ts: two ordinary words ("perjalanan", "karya") are
                permitted inside this block and nowhere else in the site's own voice. */}
            <p className={styles.lead} data-copy-origin="owner-verbatim">
              {artistLongBio}
            </p>
            <p className={styles.meta}>
              {siteConfig.origin} · aktif sejak {siteConfig.since} · nama panggung Akbar Nawasunda
            </p>
          </div>
        </div>

        <DrawOnView as="ol" className={styles.timeline}>
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

          {artistTimeline
            /* Only documented milestones: an undocumented year is not a row on a premium page, it
               is a note in the Studio. */
            .filter((entry) => !entry.pending)
            .map((entry) => (
              <li key={entry.marker} className={styles.stop}>
                <span className={styles.year}>{entry.marker}</span>
                <span className={styles.title}>{entry.title}</span>
                <span className={styles.detail}>{entry.detail}</span>
              </li>
            ))}
        </DrawOnView>
      </div>
    </section>
  );
}
