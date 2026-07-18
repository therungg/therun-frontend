import type { WrHistoryEntry } from '../../../../../types/leaderboards.types';

export interface WrHistoryRow {
    /** Stable React key — no `runId` on `WrHistoryEntry` to key off of. */
    key: string;
    runnerName: string;
    time: number;
    timingMethod: 'rt' | 'gt';
    setAt: string;
    supersededAt: string | null;
    /** True for the one entry still standing (`supersededAt` is null). */
    isCurrent: boolean;
    /**
     * `time - previousRecord.time`, negative for a faster (improved) record.
     * `null` for the first-ever record on this board — there's nothing to
     * compare it against.
     */
    deltaMs: number | null;
    /** How long this record stood: `supersededAt - setAt`, or `now - setAt` while still current. */
    heldMs: number;
}

/**
 * Turns raw WR history entries into display rows: newest-first with the
 * still-standing record pinned to the top, each carrying the improvement
 * delta vs. the record it broke and how long it held.
 *
 * Entries aren't assumed to arrive in any particular order from the API —
 * this sorts by `setAt` internally before deriving deltas, so a delta is
 * always computed against the chronologically-previous record regardless of
 * input order.
 */
export function toWrHistoryRows(
    entries: readonly WrHistoryEntry[],
    now: Date = new Date(),
): WrHistoryRow[] {
    const chronological = [...entries].sort(
        (a, b) => new Date(a.setAt).getTime() - new Date(b.setAt).getTime(),
    );

    const rows = chronological.map((entry, i) => {
        const setAtMs = new Date(entry.setAt).getTime();
        const supersededAt = entry.supersededAt ?? null;
        const supersededAtMs = supersededAt
            ? new Date(supersededAt).getTime()
            : null;
        const previous = i > 0 ? chronological[i - 1] : null;

        return {
            key: `${entry.runnerName}-${entry.setAt}`,
            runnerName: entry.runnerName,
            time: entry.time,
            timingMethod: entry.timingMethod,
            setAt: entry.setAt,
            supersededAt,
            isCurrent: supersededAt === null,
            deltaMs: previous ? entry.time - previous.time : null,
            heldMs: (supersededAtMs ?? now.getTime()) - setAtMs,
        };
    });

    // Newest-first, with the current record pinned first regardless of
    // where it falls chronologically (it's always last by setAt in
    // well-formed data, but this is explicit rather than assumed).
    return rows.sort((a, b) => {
        if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
        return new Date(b.setAt).getTime() - new Date(a.setAt).getTime();
    });
}

/**
 * Formats a `deltaMs` (see `WrHistoryRow`) as prose: `null` (the
 * first-ever record) is an em dash; a negative delta (faster/improved) gets
 * a minus sign, positive gets a plus. Sub-minute deltas — the overwhelming
 * majority of WR improvements — render as decimal seconds (`−3.2s`);
 * minute-plus deltas switch to `Xm Ys` (no decimal), dropping a zero-second
 * remainder (`−1m`, not `−1m 0s`).
 */
export function formatDeltaSeconds(deltaMs: number | null): string {
    if (deltaMs === null) return '—';
    const sign = deltaMs < 0 ? '−' : deltaMs > 0 ? '+' : '';
    const abs = Math.abs(deltaMs);

    if (abs < 60_000) {
        return `${sign}${(abs / 1000).toFixed(1)}s`;
    }

    const minutes = Math.floor(abs / 60_000);
    const seconds = Math.round((abs % 60_000) / 1000);
    return seconds > 0
        ? `${sign}${minutes}m ${seconds}s`
        : `${sign}${minutes}m`;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

function plural(n: number, unit: string): string {
    return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

/**
 * Formats a `heldMs` (see `WrHistoryRow`) as prose ("3 days", "9 hours"),
 * same granularity ladder as `relativeDate` (minutes -> hours -> days ->
 * months -> years) but as a duration rather than a "time ago". Reusing
 * `DurationToFormatted` here reads badly at this scale (a 3-day hold prints
 * "72h 00m") — this is the narrative-appropriate alternative.
 */
export function formatHeldDuration(ms: number): string {
    const abs = Math.max(0, ms);
    if (abs < HOUR_MS)
        return plural(Math.max(1, Math.round(abs / MINUTE_MS)), 'minute');
    if (abs < DAY_MS) return plural(Math.round(abs / HOUR_MS), 'hour');
    if (abs < MONTH_MS) return plural(Math.round(abs / DAY_MS), 'day');
    if (abs < YEAR_MS) return plural(Math.round(abs / MONTH_MS), 'month');
    return plural(Math.round(abs / YEAR_MS), 'year');
}
