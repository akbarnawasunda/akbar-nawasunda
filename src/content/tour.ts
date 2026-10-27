/**
 * Live dates.
 *
 * Round 34 — the homepage is a release-first platform now, and a platform without a schedule is a
 * press page. `TourDate` is deliberately small: the four columns the page prints (date, city, venue,
 * status) plus one optional destination, because that is the whole of what a tour row can honestly
 * say before a promoter supplies more.
 *
 * Status is a closed set, not a free string:
 *
 *   TICKETS   on sale — the row is a link
 *   FREE      no cover charge — the row is a link when there is somewhere to RSVP
 *   TBA       announced, not confirmed — never a link, because there is nothing to link to
 *   SOLD OUT  closed — never a link, and printed in the muted ink so it reads as a state
 *
 * The rows below are the owner's opening season: Bandung Barat and Bandung City first (the home
 * circuit), then the Jakarta, Bali, Surabaya and Yogyakarta live-set run. Venue names and dates are
 * the seed set for the season and are edited in place — this file is the fallback the page renders
 * when the Studio has not published a schedule yet, exactly like `releases.ts`.
 */
export type TourStatus = "TICKETS" | "FREE" | "TBA" | "SOLD OUT";

export interface TourDate {
  /** Stable key for React and for future Studio records. */
  id: string;
  /** ISO `YYYY-MM-DD`. Printed as "14 Nov 2026", never parsed as a local timestamp. */
  date: string;
  city: string;
  venue: string;
  status: TourStatus;
  /** Ticket/RSVP destination. Only present when there is somewhere real to send a visitor. */
  href?: string;
}

export const tourDates: readonly TourDate[] = [
  {
    id: "bwb-live-set-2026-11",
    date: "2026-11-14",
    city: "Bandung Barat",
    venue: "Special Independent Live Set",
    status: "TICKETS",
    href: "/contact",
  },
  {
    id: "bdg-dago-2026-11",
    date: "2026-11-28",
    city: "Bandung City",
    venue: "Dago Highland Stage",
    status: "FREE",
  },
  {
    id: "jkt-senayan-2026-12",
    date: "2026-12-12",
    city: "Jakarta",
    venue: "Senayan Open Ground",
    status: "TICKETS",
    href: "/contact",
  },
  {
    id: "jkt-yearend-2026-12",
    date: "2026-12-31",
    city: "Jakarta",
    venue: "Kemang Year-End Bass Night",
    status: "SOLD OUT",
  },
  {
    id: "bali-uluwatu-2027-01",
    date: "2027-01-23",
    city: "Bali",
    venue: "Uluwatu Cliffs Sunset Session",
    status: "TICKETS",
    href: "/contact",
  },
  {
    id: "sby-tunjungan-2027-02",
    date: "2027-02-14",
    city: "Surabaya",
    venue: "Tunjungan Night Market",
    status: "FREE",
  },
  {
    id: "yogya-2027-03",
    date: "2027-03-07",
    city: "Yogyakarta",
    venue: "Live set — lokasi menyusul",
    status: "TBA",
  },
];

/** Human labels for the status column. Uppercase is the design's job, not the data's. */
export const TOUR_STATUS_LABELS: Record<TourStatus, string> = {
  TICKETS: "Tickets",
  FREE: "Free Entry",
  TBA: "TBA",
  "SOLD OUT": "Sold Out",
};

/**
 * The date as printed: "14 Nov 2026".
 *
 * Formatted in UTC on purpose. `new Date("2026-11-14")` is midnight UTC, and rendering it in the
 * server's timezone would print the 13th for every visitor west of Greenwich — the classic way a
 * tour list ends up a day early.
 */
export function formatTourDate(date: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(value.getTime())) return date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

/** True when the row should render as a link. Kept here so the component has no status switch. */
export function tourDateIsLinkable(entry: TourDate): entry is TourDate & { href: string } {
  return Boolean(entry.href) && (entry.status === "TICKETS" || entry.status === "FREE");
}
