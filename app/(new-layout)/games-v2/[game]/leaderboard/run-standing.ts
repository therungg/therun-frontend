import type { DisplayRank } from './display-rank';

/**
 * Where a run sits relative to its neighbours on the loaded board window —
 * what the run hover card's gap block shows. Computed from the loaded
 * entries only: the board is paged, so #1 is only known on the page that
 * holds it, and the run ahead only when it is on the same page.
 */
export interface RunStanding {
    /** The run shares the tie-resolved rank 1. */
    isLeader: boolean;
    /** #1's ranked time, when loaded and this run is not #1 itself. */
    leaderTime: number | null;
    /** The nearest strictly faster run — what it takes to move up. */
    ahead: { rankLabel: string; time: number } | null;
    /** For the leader: the nearest strictly slower run — the lead's size. */
    behind: { rankLabel: string; time: number } | null;
}

interface StandingEntry {
    time: number | null;
}

const bareLabel = (rank: DisplayRank) => rank.label.replace(/^=/, '');

export function computeRunStandings(
    entries: StandingEntry[],
    displayRanks: DisplayRank[],
): RunStanding[] {
    const leaderLoaded = entries.length > 0 && displayRanks[0]?.rank === 1;
    const leaderTime = leaderLoaded ? entries[0].time : null;

    return entries.map((entry, i) => {
        const t = entry.time;
        const isLeader = displayRanks[i]?.rank === 1;
        if (t == null) {
            return { isLeader, leaderTime: null, ahead: null, behind: null };
        }

        let ahead: RunStanding['ahead'] = null;
        for (let j = i - 1; j >= 0; j--) {
            const other = entries[j].time;
            if (other != null && other < t) {
                ahead = { rankLabel: bareLabel(displayRanks[j]), time: other };
                break;
            }
        }

        let behind: RunStanding['behind'] = null;
        if (isLeader) {
            for (let j = i + 1; j < entries.length; j++) {
                const other = entries[j].time;
                if (other != null && other > t) {
                    behind = {
                        rankLabel: bareLabel(displayRanks[j]),
                        time: other,
                    };
                    break;
                }
            }
        }

        return {
            isLeader,
            leaderTime: isLeader ? null : leaderTime,
            ahead,
            behind,
        };
    });
}
