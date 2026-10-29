import Link from "next/link";

import type { CoverArtwork } from "@/content/covers";

import { Plate3D } from "../zine/Plate3D";
import { ReleaseCover } from "./ReleaseCover";
import styles from "./ReleasePlate.module.css";
import { UNRECORDED } from "@/content/copy";

/**
 * One release, printed as a sleeve on a blue table.
 *
 * A release page is the page a stranger lands on from a shared link: the only page on the site that
 * gets judged in one screen, by someone who has never heard of the artist. It used to be a document
 * — eyebrow, title, grey paragraph, four text links, a bordered square on the right — which is the
 * shape of a wiki entry, not of a record.
 *
 * So it is built like the sleeve itself. One field of the identity colour, the title at sleeve scale
 * in ink, the artwork large and turned towards the reader on a plate, and the listen links printed
 * *inside* the same field as rows that invert to ink under the pointer. Under the band, on ink: the
 * colophon of verified facts and the two neighbouring releases, because a catalogue is a set you
 * move through rather than a page you land on.
 *
 * Honesty rules are unchanged: `ordinal` is a position in the owner's own list (printed as
 * "Katalog 03 / 10", never as an invented catalogue number), every fact comes from the owner's data,
 * and anything unconfirmed prints an explicit "Tidak tercatat" instead of being guessed — or a
 * dash, which reads as a blank field rather than an absent fact (Langkah 3i).
 */
export interface ReleaseNeighbour {
  slug: string;
  title: string;
  artwork: CoverArtwork;
}

export interface ReleasePlateProps {
  title: string;
  /** Printed after the title in italic — the original artist on a remix. */
  titleTail?: string | null;
  /** Position in the catalogue, already padded ("03"). Null hides the counter. */
  ordinal?: string | null;
  total?: string | null;
  /** Free-form mono parts: type, year, era. Joined with a middot. */
  meta: readonly string[];
  description?: string | null;
  artwork: CoverArtwork;
  links: readonly { label: string; href: string }[];
  facts: readonly { label: string; value: string | null }[];
  prev?: ReleaseNeighbour | null;
  next?: ReleaseNeighbour | null;
}

export function ReleasePlate({
  title,
  titleTail,
  ordinal,
  total,
  meta,
  description,
  artwork,
  links,
  facts,
  prev,
  next,
}: ReleasePlateProps) {
  return (
    <article className={styles.record}>
      {/* ------------------------------------------------------------ the sleeve */}
      <header className={styles.band}>
        <div className={styles.bandInner}>
          <div className={styles.copy}>
            <p className={styles.kicker}>
              <span className={styles.counter}>
                {ordinal && total ? (
                  <>
                    Katalog {ordinal} <span aria-hidden="true">/</span> {total}
                  </>
                ) : (
                  "Katalog"
                )}
              </span>
              {meta.length > 0 ? <span className={styles.meta}>{meta.join(" · ")}</span> : null}
            </p>

            <h1 className={`${styles.title} ink`}>
              {title}
              {titleTail ? <em className={styles.tail}> — {titleTail}</em> : null}
            </h1>

            {description ? <p className={styles.lead}>{description}</p> : null}

            {links.length === 0 ? (
              <p className={styles.noLinks}>
                <span className={styles.noLinksLabel}>Tautan</span>
                Tautan mendengarkan untuk rilis ini belum tersedia.
              </p>
            ) : null}
          </div>

          {/*
            The artwork, held out from the blue field. A flat sheet of ink sits 20 px down and right
            of it at its own depth, so a pointer tilt separates print from shadow — which is the
            whole reason the sleeve is on a plate instead of in a `<figure>` with a border.
          */}
          <Plate3D
            className={styles.artworkStage}
            data-plate="release-sleeve"
            tiltY={12}
            tiltX={9}
            shift={16}
            perspective={1000}
          >
            <div className={styles.artwork}>
              <span className={styles.artworkPlate} aria-hidden="true" />
              <span className={styles.artworkFace}>
                <ReleaseCover artwork={artwork} title={title} shape="square" showTitle={false} />
              </span>
            </div>
          </Plate3D>

          {/*
            Listening lives *in* the band. On a field of the identity colour the rows are printed in
            ink over hairlines and invert to dark on hover; below the band they left a third of the
            blue field empty and made the page look like two different designs stacked.
          */}
          {links.length > 0 ? (
            <ul className={styles.links} aria-label="Dengarkan di">
              {links.map((link, index) => (
                <li key={link.href}>
                  <a
                    className={styles.link}
                    href={link.href}
                    rel="noopener noreferrer"
                    target="_blank"
                    data-release-link
                  >
                    <span className={styles.linkIndex} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.linkLabel}>{link.label}</span>
                    <span className={styles.linkArrow} aria-hidden="true">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </header>

      {/* --------------------------------------------------------------- colophon */}
      <section className={styles.factsBand} aria-labelledby="facts-title">
        <div className={styles.factsInner}>
          <h2 className={styles.sectionLabel} id="facts-title">
            Lembar data
          </h2>
          <dl className={styles.facts}>
            {facts.map((fact) => (
              <div key={fact.label} className={styles.fact}>
                <dt>{fact.label}</dt>
                <dd>{fact.value ?? UNRECORDED}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------------------- more */}
      <nav className={styles.more} aria-label="Rilis lain">
        <div className={styles.moreInner}>
          {prev ? (
            <Link className={styles.neighbour} href={`/music/${prev.slug}`} rel="prev">
              <span className={styles.neighbourLabel}>← Sebelumnya</span>
              <span className={styles.neighbourSleeve}>
                <ReleaseCover artwork={prev.artwork} title={prev.title} showTitle={false} />
              </span>
              <span className={styles.neighbourTitle}>{prev.title}</span>
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}

          <Link className={styles.all} href="/music">
            Semua rilis
          </Link>

          {next ? (
            <Link
              className={`${styles.neighbour} ${styles.neighbourNext}`}
              href={`/music/${next.slug}`}
              rel="next"
            >
              <span className={styles.neighbourLabel}>Berikutnya →</span>
              <span className={styles.neighbourSleeve}>
                <ReleaseCover artwork={next.artwork} title={next.title} showTitle={false} />
              </span>
              <span className={styles.neighbourTitle}>{next.title}</span>
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>
      </nav>
    </article>
  );
}
