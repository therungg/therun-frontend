const DAY_MS = 86_400_000;

/**
 * Short relative date for board rows and the crown meta.
 * Calendar-day based ("yesterday" means the previous calendar day, UTC).
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
    if (days < 365) return `${Math.floor(days / 30)} mo ago`;
    return `${Math.floor(days / 365)} yr ago`;
}
