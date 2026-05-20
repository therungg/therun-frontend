export function formatHours(ms: number): string {
    const hours = ms / 3_600_000;
    if (hours >= 1_000_000) return `${(hours / 1_000_000).toFixed(1)}M`;
    if (hours >= 1_000) return `${(hours / 1_000).toFixed(1)}K`;
    if (hours < 1) return hours.toFixed(1);
    return Math.round(hours).toLocaleString();
}

export function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
}

const MIN_PLAYTIME_MS = 3_600_000;

export function isLowActivityCategory(c: {
    totalRunTime?: number;
    totalFinishedAttemptCount?: number;
}): boolean {
    return (
        (c.totalRunTime ?? 0) < MIN_PLAYTIME_MS ||
        (c.totalFinishedAttemptCount ?? 0) === 0
    );
}
