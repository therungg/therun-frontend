import { type TimingKey, timingValue } from './timing-columns';

/**
 * The minimum an entry has to carry to be ranked. Structural rather than
 * `LeaderboardEntry` so the moderator curation table — whose rows come from
 * the roster endpoint with a different shape — can rank by the same rule
 * instead of printing raw row numbers.
 */
export interface RankableEntry {
    rank: number;
    realTime: number | null;
    gameTime: number | null;
}

export interface DisplayRank {
    /** What to render in the rank cell, e.g. "1" or "=1". */
    label: string;
    /** True when this entry shares its primary time with an adjacent entry. */
    tied: boolean;
}

/**
 * Derives a display rank per entry over the merged, rank-ordered window
 * currently loaded on the board. Backend rank isn't guaranteed to collapse
 * to a shared value on ties (see handoff W10 — authoritative ties), so this
 * is computed purely from consecutive primary-time equality within what's
 * loaded: a tie that straddles an unloaded page boundary won't be marked,
 * which is the honest behavior given only a windowed view of the board.
 */
export function computeDisplayRanks(
    entries: RankableEntry[],
    primaryTiming: TimingKey,
): DisplayRank[] {
    const out: DisplayRank[] = [];
    let groupRank = 0;
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const prev = i > 0 ? entries[i - 1] : null;
        const next = i < entries.length - 1 ? entries[i + 1] : null;
        const value = timingValue(entry, primaryTiming);
        const tiedWithPrev =
            prev != null &&
            value != null &&
            timingValue(prev, primaryTiming) === value;
        const tiedWithNext =
            next != null &&
            value != null &&
            timingValue(next, primaryTiming) === value;
        if (!tiedWithPrev) groupRank = entry.rank;
        const tied = tiedWithPrev || tiedWithNext;
        out.push({ label: tied ? `=${groupRank}` : `${groupRank}`, tied });
    }
    return out;
}
