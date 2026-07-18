// A date-only string as typed into an <input type="date"> ("2026-07-18"), or
// the same value round-tripped through the API as a UTC-midnight timestamp
// ("2026-07-18T00:00:00.000Z" / "...T00:00:00Z"). Either way, no real
// time-of-day was ever recorded — the calendar date is the only signal, and
// it must render identically in every viewer timezone.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const UTC_MIDNIGHT = /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/;

/**
 * Format a `runDate` value for display, preserving the calendar date the
 * runner typed regardless of the viewer's timezone.
 *
 * Date-only values (or their UTC-midnight timestamp equivalent) are rendered
 * with the date fixed to UTC, so a run logged as "2026-07-18" always shows
 * as July 18 — never shifted a day earlier for viewers west of UTC. True
 * timestamps (a real recorded time-of-day, e.g. from a live run finishing)
 * fall back to plain local-time rendering.
 */
export function formatRunDate(iso: string): string {
    const isDateOnly = DATE_ONLY.test(iso) || UTC_MIDNIGHT.test(iso);
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';

    return isDateOnly
        ? date.toLocaleDateString(undefined, { timeZone: 'UTC' })
        : date.toLocaleDateString();
}
