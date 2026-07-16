import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';

function identity(e: LeaderboardEntry): string {
    if (e.runId != null) return `run:${e.runId}`;
    if (e.manualTimeId != null) return `manual:${e.manualTimeId}`;
    return `name:${e.runnerName}:${e.rank}`;
}

/** Flatten fetched pages into one rank-ordered, deduplicated list. */
export function mergeEntries(pages: LeaderboardEntry[][]): LeaderboardEntry[] {
    const seen = new Set<string>();
    const out: LeaderboardEntry[] = [];
    for (const page of pages) {
        for (const e of page) {
            const key = identity(e);
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(e);
        }
    }
    return out.sort((a, b) => a.rank - b.rank);
}
