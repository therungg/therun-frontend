import { formatTimeMs } from '~src/lib/run-view/time-format';

const DAY_MS = 86_400_000;

/** Unsigned gap: "4.002" under a minute, "2:16" above. */
export function formatDelta(ms: number): string {
    const abs = Math.abs(ms);
    if (abs < 60_000) return (abs / 1000).toFixed(3);
    return formatTimeMs(abs);
}

/** Signed gap between two times: "+3:34", "−0:12", "+0.412". */
export function formatGap(ms: number): string {
    return `${ms < 0 ? '−' : '+'}${formatDelta(ms)}`;
}

/** Time since a date, as a duration: "12 days", "4 months", "2 years". */
export function heldFor(iso: string, now: Date = new Date()): string | null {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return null;
    const days = Math.max(0, Math.floor((now.getTime() - then) / DAY_MS));
    const plural = (n: number, unit: string) =>
        `${n} ${unit}${n === 1 ? '' : 's'}`;
    if (days < 1) return 'under a day';
    if (days < 30) return plural(days, 'day');
    if (days < 365) return plural(Math.floor(days / 30), 'month');
    return plural(Math.floor(days / 365), 'year');
}
