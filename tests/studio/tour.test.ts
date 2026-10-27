import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TOUR_STATUS_LABELS,
  formatTourDate,
  tourDateIsLinkable,
  tourDates,
  type TourDate,
  type TourStatus,
} from "../../src/content/tour";

/**
 * Tour dates — the four rules the matrix depends on.
 *
 * The schedule is the second thing a visitor comes to the site for, and every failure mode here is
 * a *quiet* one: a date a day early, a "Sold Out" row that still looks like a buy button, a row with
 * no city. None of them throw, so they need a test rather than a screenshot.
 */

const STATUSES: readonly TourStatus[] = ["TICKETS", "FREE", "TBA", "SOLD OUT"];

describe("tour dates", () => {
  it("prints the date in the same calendar day the data holds", () => {
    /*
     * `new Date("2026-11-14")` is midnight UTC. Formatting it with the server's local timezone
     * prints "13 Nov 2026" for anything west of Greenwich, which is the classic off-by-one in a
     * tour list. The formatter pins UTC, so these assertions are the guard against a future
     * "simplification" that drops the timeZone option.
     */
    const printed = formatTourDate("2026-11-14");
    assert.match(printed, /14/);
    assert.match(printed, /2026/);
    assert.doesNotMatch(printed, /13/);

    /* A year boundary is where a neighbouring-day bug is loudest. */
    assert.match(formatTourDate("2026-12-31"), /31/);
    assert.match(formatTourDate("2027-01-01"), /01/);
    assert.match(formatTourDate("2027-01-01"), /2027/);
  });

  it("falls back to the raw string when the date is not a date", () => {
    assert.equal(formatTourDate("menyusul"), "menyusul");
    assert.equal(formatTourDate(""), "");
  });

  it("only makes a row a link when there is a destination and the show is open", () => {
    const base: TourDate = { id: "x", date: "2026-11-14", city: "Bandung City", venue: "Stage", status: "TICKETS" };

    assert.equal(tourDateIsLinkable({ ...base, href: "/contact" }), true);
    assert.equal(tourDateIsLinkable({ ...base, status: "FREE", href: "/contact" }), true);

    /* No destination: never a link, whatever the status claims. */
    assert.equal(tourDateIsLinkable({ ...base, href: undefined }), false);

    /* A destination on a closed or unconfirmed show is still not a door a visitor should open. */
    assert.equal(tourDateIsLinkable({ ...base, status: "SOLD OUT", href: "/contact" }), false);
    assert.equal(tourDateIsLinkable({ ...base, status: "TBA", href: "/contact" }), false);
  });

  it("has a label for every status in the closed set", () => {
    for (const status of STATUSES) {
      assert.equal(typeof TOUR_STATUS_LABELS[status], "string");
      assert.ok(TOUR_STATUS_LABELS[status].length > 0);
    }
    assert.deepEqual(Object.keys(TOUR_STATUS_LABELS).sort(), [...STATUSES].sort());
  });

  it("keeps the seeded season ordered, unique and complete", () => {
    assert.ok(tourDates.length >= 5, "the homepage needs a schedule worth scanning");

    const ids = new Set<string>();
    let previous = "";
    for (const entry of tourDates) {
      assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/, `${entry.id}: date must be ISO YYYY-MM-DD`);
      assert.ok(entry.city.trim().length > 0, `${entry.id}: city is required`);
      assert.ok(entry.venue.trim().length > 0, `${entry.id}: venue is required`);
      assert.ok(!ids.has(entry.id), `${entry.id}: duplicate id`);
      ids.add(entry.id);

      /* The table is read top to bottom as a calendar, so the data has to arrive sorted. */
      assert.ok(entry.date > previous, `${entry.id}: rows must ascend by date`);
      previous = entry.date;
    }
  });

  it("does not link a row whose status is not in the closed set", () => {
    for (const entry of tourDates) {
      if (entry.status === "TBA" || entry.status === "SOLD OUT") {
        assert.equal(tourDateIsLinkable(entry), false, `${entry.id}: ${entry.status} must not be a link`);
      }
    }
  });
});
