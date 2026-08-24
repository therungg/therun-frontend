// Shared "which account looks abandoned" helpers for the duplicate-runs
// admin review UI. See docs/frontend-guide-duplicate-runs.md's account-activity
// behavioral note: lastActive = max(lastLogin, lastRunActivity); a side stale
// on both while the other side is recent suggests the stale side is an
// abandoned duplicate account belonging to the same person.

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Millis of the more recent of the two timestamps, or null if both are null. */
export function lastActiveMs(
    lastLogin: string | null,
    lastRunActivity: string | null,
): number | null {
    const candidates = [lastLogin, lastRunActivity]
        .filter((v): v is string => v !== null)
        .map((v) => new Date(v).getTime());
    if (candidates.length === 0) return null;
    return Math.max(...candidates);
}

export function isStale(
    activeMs: number | null,
    now: number = Date.now(),
): boolean {
    return activeMs === null || now - activeMs > THIRTY_DAYS_MS;
}

/** "last active {date}" or "no recorded activity", for a side's column header. */
export function lastActiveLabel(activeMs: number | null): string {
    return activeMs === null
        ? 'no recorded activity'
        : `last active ${new Date(activeMs).toLocaleDateString()}`;
}
