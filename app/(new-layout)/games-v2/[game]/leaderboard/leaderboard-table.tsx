import type { LeaderboardResponse } from '../../../../../types/leaderboards.types';
import { ClearFiltersButton } from '../filters/clear-filters-button';
import { LeaderboardRow } from './leaderboard-row';

interface Props {
    leaderboard: LeaderboardResponse;
    sessionUsername: string | null;
    canManage: boolean;
    gameSlug: string;
    variableKeys: string[];
}

export function LeaderboardTable({
    leaderboard,
    sessionUsername,
    canManage,
    gameSlug,
    variableKeys,
}: Props) {
    if (leaderboard.entries.length === 0) {
        return (
            <div className="text-center my-4">
                <p className="text-muted">No runs match these filters.</p>
                <ClearFiltersButton variableKeys={variableKeys} />
            </div>
        );
    }

    const { hideRealTime, hideGameTime } = leaderboard;

    return (
        <table className="table table-hover">
            <thead>
                <tr>
                    <th style={{ width: '6%' }}>#</th>
                    <th>Runner</th>
                    {!hideRealTime && <th>Real Time</th>}
                    {!hideGameTime && <th>Game Time</th>}
                    <th>Date</th>
                    <th>VOD</th>
                    <th>Verified</th>
                    <th />
                </tr>
            </thead>
            <tbody>
                {leaderboard.entries.map((entry) => (
                    <LeaderboardRow
                        key={entry.runId ?? `${entry.runnerName}-${entry.rank}`}
                        entry={entry}
                        isCurrentUser={
                            sessionUsername !== null &&
                            entry.runnerName === sessionUsername
                        }
                        canManage={canManage}
                        gameSlug={gameSlug}
                        hideRealTime={hideRealTime}
                        hideGameTime={hideGameTime}
                        sessionUsername={sessionUsername}
                    />
                ))}
            </tbody>
        </table>
    );
}
