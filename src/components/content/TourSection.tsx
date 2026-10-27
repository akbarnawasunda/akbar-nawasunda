import Link from "next/link";

import {
  TOUR_STATUS_LABELS,
  formatTourDate,
  tourDateIsLinkable,
  type TourDate,
} from "@/content/tour";
import { Container } from "@/components/layout/Container";

import styles from "./TourSection.module.css";

interface TourSectionProps {
  dates: readonly TourDate[];
  /**
   * Where a ticketed row sends a visitor. The owner has no ticketing vendor wired up, so the action
   * points at the contact route, which is the page that actually answers "can I get in?".
   */
  actionHref?: string;
}

/**
 * Tour matrix — four columns, one hairline per row, no cards.
 *
 * The design is Swiss for a reason that is not stylistic: a schedule is a table. Date, city, venue,
 * status are four facts with the same shape on every row, and a grid of rounded cards would destroy
 * the only thing a visitor does with this band — scan down the date column and stop at a city they
 * live in. Real `<table>` markup means that scan works with a screen reader too (the header cells
 * are announced with each value), which a stack of `<div>`s never does.
 *
 * Interaction, from the brief: the row washes to a slightly lighter ink, and its outer edge draws a
 * 1px signal-blue laser. Hover is the only motion, so `prefers-reduced-motion` has nothing to
 * disable here beyond the transitions.
 */
export function TourSection({ dates, actionHref = "/contact" }: TourSectionProps) {
  return (
    <section className={styles.section} id="tour" aria-labelledby="tour-title">
      <Container>
        <div className={styles.head}>
          <p className={styles.eyebrow}>
            <span className={styles.live} aria-hidden="true" />
            Live
          </p>
          <h2 id="tour-title" className={styles.title}>
            Tour Dates
          </h2>
          <p className={styles.note}>
            {dates.length.toString().padStart(2, "0")} tanggal · tiket &amp; RSVP lewat halaman kontak
          </p>
        </div>

        <table className={styles.table}>
          <caption className={styles.caption}>
            Jadwal live set Akbar Nawasunda: tanggal, kota, tempat, dan status tiket.
          </caption>
          <thead className={styles.thead}>
            <tr>
              <th scope="col" className={styles.th}>
                Tanggal
              </th>
              <th scope="col" className={styles.th}>
                Kota
              </th>
              <th scope="col" className={styles.th}>
                Tempat
              </th>
              <th scope="col" className={`${styles.th} ${styles.thEnd}`}>
                Status
              </th>
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {dates.map((entry) => {
              const label = TOUR_STATUS_LABELS[entry.status];
              const href = entry.href ?? actionHref;
              return (
                <tr key={entry.id} className={styles.row} data-status={entry.status}>
                  <td className={`${styles.cell} ${styles.dateCell}`} data-label="Tanggal">
                    <time className={styles.date} dateTime={entry.date}>
                      {formatTourDate(entry.date)}
                    </time>
                  </td>
                  <td className={`${styles.cell} ${styles.cityCell}`} data-label="Kota">
                    <span className={styles.city}>{entry.city}</span>
                  </td>
                  <td className={`${styles.cell} ${styles.venueCell}`} data-label="Tempat">
                    <span className={styles.venue}>{entry.venue}</span>
                  </td>
                  <td className={`${styles.cell} ${styles.actionCell}`} data-label="Status">
                    {tourDateIsLinkable(entry) ? (
                      <Link
                        className={styles.status}
                        data-status={entry.status}
                        href={href}
                        aria-label={`${label} — ${entry.city}, ${formatTourDate(entry.date)}`}
                      >
                        {label}
                        <span className={styles.arrow} aria-hidden="true">
                          ↗
                        </span>
                      </Link>
                    ) : (
                      <span className={styles.status} data-status={entry.status}>
                        {label}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Container>
    </section>
  );
}
