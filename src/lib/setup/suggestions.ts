// Pure suggestion math for wizard steps. Kept separate from completeness so
// each stays independently testable.

const MINUTE_MS = 60_000;

/** Round a duration down to a "clean" value a human would pick. */
export function roundToCleanTimeMs(ms: number): number {
    if (ms >= 10 * MINUTE_MS) return Math.floor(ms / MINUTE_MS) * MINUTE_MS;
    if (ms >= MINUTE_MS) return Math.floor(ms / 15_000) * 15_000;
    return Math.floor(ms / 5_000) * 5_000;
}

/**
 * Suggested minimum time: ~70% of the fastest verified run, rounded clean.
 * Only offered when the board has enough data to trust (≥10 finished runs).
 */
export function suggestMinTimeMs(
    fastestVerifiedMs: number | null,
    finishedRunCount: number,
): number | null {
    if (fastestVerifiedMs === null || fastestVerifiedMs <= 0) return null;
    if (finishedRunCount < 10) return null;
    return roundToCleanTimeMs(fastestVerifiedMs * 0.7);
}

/** Percentage (0–100, rounded) of finished runs that live in active categories. */
export function activityShare(
    categories: { totalFinishedAttemptCount: number; active: boolean }[],
): number {
    const total = categories.reduce(
        (sum, c) => sum + c.totalFinishedAttemptCount,
        0,
    );
    if (total === 0) return 0;
    const activeTotal = categories
        .filter((c) => c.active)
        .reduce((sum, c) => sum + c.totalFinishedAttemptCount, 0);
    return Math.round((activeTotal / total) * 100);
}
