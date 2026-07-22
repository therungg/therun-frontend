import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';

export interface CardEntries {
    wr: LeaderboardEntry | null;
    podium: LeaderboardEntry[];
}

// A plaque only claims a record when the board's first entry is a real
// rank-1 with a time; otherwise the whole card renders the no-runs state
// (podium suppressed with it — never show runners-up under a missing WR).
export function splitCardEntries(entries: LeaderboardEntry[]): CardEntries {
    const first = entries[0] ?? null;
    if (!first || first.rank !== 1 || first.time === null) {
        return { wr: null, podium: [] };
    }
    return { wr: first, podium: entries.slice(1, 3) };
}
