import type { LeaderboardExportEntry } from '../../../../../types/leaderboards.types';
import type { BreakdownRow } from './breakdown-bars';

/** One featured board's export, kept whole so the per-category derivations
 *  (time spread, participation split) don't have to un-mix a flat pile. */
export interface BoardEntries {
    slug: string;
    display: string;
    entries: LeaderboardExportEntry[];
}

export function platformRows(
    entries: LeaderboardExportEntry[],
): BreakdownRow[] {
    const counts = new Map<string, number>();
    for (const e of entries) {
        const p = e.platform?.trim();
        if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, count]) => ({ label, count }));
}

/** Hardware/emulator is a two-way split, so it reads as one filled bar
 *  rather than a two-row ranking of a ranking that has no order. */
export function emulatorSplit(
    entries: LeaderboardExportEntry[],
): { hardware: number; emulator: number } | null {
    let emulator = 0;
    let hardware = 0;
    for (const e of entries) {
        if (e.emulator === true) emulator++;
        else if (e.emulator === false) hardware++;
    }
    if (emulator + hardware === 0) return null;
    return { hardware, emulator };
}

/** Where the game's ranked runners actually are: entries per featured board. */
export function categoryRows(boards: BoardEntries[]): BreakdownRow[] {
    return boards
        .filter((b) => b.entries.length > 0)
        .map((b) => ({ label: b.display, count: b.entries.length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
}

export interface Column {
    key: string;
    value: number;
    /** Axis tick — short enough to sit under a column. */
    label: string;
    /** What the column covers, spelled out for the hover card. */
    range: string;
    /** A catch-all bucket whose width isn't to scale — drawn set apart. */
    overflow?: boolean;
}

const MONTH_LABEL = new Intl.DateTimeFormat([], {
    month: 'short',
    timeZone: 'UTC',
});

const MONTH_FULL = new Intl.DateTimeFormat([], {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
});

/**
 * A runner is "new" in the month their first ranked run on any featured
 * board is dated — the closest thing the board data has to an arrival.
 * Runs whose date the importer never carried are skipped, not bucketed
 * into today, or an import spike would read as a recruitment drive.
 */
export function newRunnerColumns(
    boards: BoardEntries[],
    months = 12,
): Column[] {
    const firstSeen = new Map<string, string>();
    for (const b of boards) {
        for (const e of b.entries) {
            const date = e.runDate?.slice(0, 10);
            if (!date || date.length !== 10) continue;
            const who = e.userId != null ? `u${e.userId}` : `g${e.runnerName}`;
            const prev = firstSeen.get(who);
            if (!prev || date < prev) firstSeen.set(who, date);
        }
    }
    const counts = new Map<string, number>();
    for (const date of firstSeen.values()) {
        const key = date.slice(0, 7);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const out: Column[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
        );
        const key = d.toISOString().slice(0, 7);
        const value = counts.get(key) ?? 0;
        // January carries the year, so a twelve-month axis says which one.
        const isYearMark = d.getUTCMonth() === 0 || i === months - 1;
        out.push({
            key,
            value,
            label: isYearMark
                ? `${MONTH_LABEL.format(d)} '${String(d.getUTCFullYear()).slice(2)}`
                : MONTH_LABEL.format(d),
            range: MONTH_FULL.format(d),
        });
    }
    return out;
}

/**
 * Bucket widths a runner would actually name. A histogram cut into
 * fourteenths of a range lands on boundaries like 16:51 — arithmetically
 * correct, unreadable as a scale — so the width is snapped to the next
 * step up this ladder instead.
 */
const STEP_LADDER_MS = [
    100,
    250,
    500,
    1_000,
    2_000,
    5_000,
    10_000,
    15_000,
    30_000,
    60_000,
    2 * 60_000,
    5 * 60_000,
    10 * 60_000,
    15 * 60_000,
    30 * 60_000,
    60 * 60_000,
    2 * 60 * 60_000,
    6 * 60 * 60_000,
    12 * 60 * 60_000,
    24 * 60 * 60_000,
];

/** Widest bucket count worth drawing before the next ladder step is picked. */
const MAX_BUCKETS = 18;

function niceStep(span: number, target: number): number {
    const raw = span / target;
    return (
        STEP_LADDER_MS.find((s) => s >= raw) ??
        STEP_LADDER_MS[STEP_LADDER_MS.length - 1]
    );
}

/**
 * PB spread for one board, cut on round boundaries: the bucket width comes
 * off the ladder above and the first bucket starts on a multiple of it, so
 * the axis reads 15:00 / 16:00 / 17:00 rather than wherever the fastest run
 * happened to land. The slowest 5% share one catch-all bucket instead of
 * their own axis — one 40-hour meme run otherwise flattens every real
 * column to a hairline.
 */
export function timeHistogram(
    entries: LeaderboardExportEntry[],
    format: (ms: number) => string,
    target = 12,
): Column[] {
    const times = entries
        .map((e) => e.time)
        .filter((t): t is number => typeof t === 'number' && t > 0)
        .sort((a, b) => a - b);
    if (times.length < 5) return [];

    const min = times[0];
    const cap =
        times[Math.floor(times.length * 0.95)] ?? times[times.length - 1];
    if (cap <= min) return [];

    let step = niceStep(cap - min, target);
    let start = Math.floor(min / step) * step;
    let count = Math.ceil((cap - start) / step);
    // Snapping the start outward can push the count past what fits; take
    // the next width up until it does.
    while (count > MAX_BUCKETS) {
        const next = STEP_LADDER_MS.find((s) => s > step);
        if (!next) break;
        step = next;
        start = Math.floor(min / step) * step;
        count = Math.ceil((cap - start) / step);
    }
    count = Math.max(1, Math.min(count, MAX_BUCKETS));

    const last = start + count * step;
    const counts = new Array<number>(count + 1).fill(0);
    for (const t of times) {
        const i = t >= last ? count : Math.floor((t - start) / step);
        counts[Math.max(0, Math.min(i, count))]++;
    }

    return counts.map((value, i) => {
        const from = start + step * i;
        const overflow = i === count;
        return {
            key: String(i),
            value,
            overflow,
            label: overflow ? 'slower' : format(from),
            range: overflow
                ? `slower than ${format(last)}`
                : `${format(from)} – ${format(from + step)}`,
        };
    });
}
