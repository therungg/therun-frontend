import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import { type TimingKey, timingValue } from './timing-columns';

export interface DisplayRank {
    /** What to render in the rank cell, e.g. "1" or "=1". */
    label: string;
    /** True when this entry shares its primary time with the entry above it. */
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
    entries: LeaderboardEntry[],
    primaryTiming: TimingKey,
): DisplayRank[] {
    const out: DisplayRank[] = [];
    let groupRank = 0;
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const prev = i > 0 ? entries[i - 1] : null;
        const value = timingValue(entry, primaryTiming);
        const tied =
            prev != null &&
            value != null &&
            timingValue(prev, primaryTiming) === value;
        if (!tied) groupRank = entry.rank;
        out.push({ label: tied ? `=${groupRank}` : `${groupRank}`, tied });
    }
    return out;
}
