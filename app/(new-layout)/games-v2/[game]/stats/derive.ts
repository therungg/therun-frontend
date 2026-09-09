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
    label: string;
    tip: string;
    /** A catch-all bucket whose width isn't to scale — drawn set apart. */
    overflow?: boolean;
}

const MONTH_LABEL = new Intl.DateTimeFormat([], {
    month: 'short',
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
        out.push({
            key,
            value,
            label: MONTH_LABEL.format(d),
            tip: `${value} first ranked ${value === 1 ? 'run' : 'runs'} in ${key}`,
        });
    }
    return out;
}

/**
 * PB spread for one board. The slowest 5% set their own bucket instead of
 * their own axis — one 40-hour meme run otherwise flattens every real
 * column to a hairline.
 */
export function timeHistogram(
    entries: LeaderboardExportEntry[],
    format: (ms: number) => string,
    buckets = 14,
): Column[] {
    const times = entries
        .map((e) => e.time)
        .filter((t): t is number => typeof t === 'number' && t > 0)
        .sort((a, b) => a - b);
    if (times.length < 5) return [];

    const min = times[0];
    const cap = times[Math.floor(times.length * 0.95)] ?? times.at(-1) ?? min;
    if (cap <= min) return [];
    const step = (cap - min) / buckets;

    const counts = new Array<number>(buckets + 1).fill(0);
    for (const t of times) {
        const i = t >= cap ? buckets : Math.floor((t - min) / step);
        counts[Math.min(i, buckets)]++;
    }

    return counts.map((value, i) => {
        const from = min + step * i;
        const to = from + step;
        const overflow = i === buckets;
        return {
            key: String(i),
            value,
            overflow,
            label: overflow ? 'slower' : format(from),
            tip: overflow
                ? `${value} runs slower than ${format(cap)}`
                : `${value} runs between ${format(from)} and ${format(to)}`,
        };
    });
}
