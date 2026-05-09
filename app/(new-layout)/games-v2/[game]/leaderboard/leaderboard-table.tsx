import type {
    LeaderboardEntry,
    LeaderboardResponse,
    ResolvedCategory,
} from '../../../../../types/leaderboards.types';
import { ClearFiltersButton } from '../filters/clear-filters-button';
import { LeaderboardRow } from './leaderboard-row';

interface Props {
    rt: LeaderboardResponse;
    gt: LeaderboardResponse;
    category: ResolvedCategory;
    sessionUsername: string | null;
}

export function LeaderboardTable({ rt, gt, category, sessionUsername }: Props) {
    const primary = category.primaryTiming === 'gt' ? gt : rt;
    if (primary.entries.length === 0) {
        return (
            <div className="text-center my-4">
                <p className="text-muted">No runs match these filters.</p>
                <ClearFiltersButton />
            </div>
        );
    }

    // Index secondary timing's entries by runner key for O(1) lookup.
    const secondary = category.primaryTiming === 'gt' ? rt : gt;
    const secondaryByRunner = new Map<string, LeaderboardEntry>();
    for (const e of secondary.entries) {
        secondaryByRunner.set(keyFor(e), e);
    }

    return (
        <table className="table table-hover">
            <thead>
                <tr>
                    <th style={{ width: '6%' }}>#</th>
                    <th>Runner</th>
                    <th>Real Time</th>
                    <th>Game Time</th>
                    <th>Date</th>
                    <th>VOD</th>
                    <th>Verified</th>
                </tr>
            </thead>
            <tbody>
                {primary.entries.map((entry) => {
                    const secondaryEntry = secondaryByRunner.get(keyFor(entry));
                    const rtE =
                        category.primaryTiming === 'gt'
                            ? secondaryEntry
                            : entry;
                    const gtE =
                        category.primaryTiming === 'gt'
                            ? entry
                            : secondaryEntry;
                    return (
                        <LeaderboardRow
                            key={
                                entry.runId ??
                                `${entry.runnerName}-${entry.rank}`
                            }
                            rank={entry.rank}
                            rtEntry={rtE}
                            gtEntry={gtE}
                            isCurrentUser={
                                sessionUsername !== null &&
                                entry.runnerName === sessionUsername
                            }
                            primaryTiming={category.primaryTiming}
                        />
                    );
                })}
            </tbody>
        </table>
    );
}

function keyFor(e: LeaderboardEntry): string {
    return e.userId !== null && e.userId !== undefined
        ? `u:${e.userId}`
        : `g:${e.runnerName}`;
}
