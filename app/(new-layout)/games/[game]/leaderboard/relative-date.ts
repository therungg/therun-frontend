const DAY_MS = 86_400_000;

/**
 * Short relative date for board rows and the crown meta.
 * Calendar-day based ("yesterday" means the previous calendar day, UTC).
 *
 * Under a year old this answers "how long ago" ("3 days ago", "9 months
 * ago"), which is what a row's age is actually being read for. A year or
 * more out it turns absolute — see below.
 */
export function relativeDate(iso: string, now: Date = new Date()): string {
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return '';
    const days = Math.floor(
        (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
            Date.UTC(
                then.getUTCFullYear(),
                then.getUTCMonth(),
                then.getUTCDate(),
            )) /
            DAY_MS,
    );
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days} days ago`;
    if (days < 365) {
        // Written out rather than "5 mo ago": this is the board's Date
        // column itself now, not a hover title, and a column of
        // abbreviations reads as a unit to decode rather than as an age.
        const months = Math.floor(days / 30);
        return `${months} month${months === 1 ? '' : 's'} ago`;
    }
    // A year or more out, "3 yr ago" rows become indistinguishable — an
    // absolute month + year keeps old runs tellable-apart at a glance.
    return then.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    });
}
