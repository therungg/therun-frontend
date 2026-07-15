import type { LeaderboardResponse } from '../../../../../types/leaderboards.types';
import { ClearFiltersButton } from '../filters/clear-filters-button';
import styles from './leaderboard.module.scss';
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
            <div className={`${styles.wrapper} text-center py-4`}>
                <p className="text-muted">No runs match these filters.</p>
                <ClearFiltersButton variableKeys={variableKeys} />
            </div>
        );
    }

    const { hideRealTime, hideGameTime } = leaderboard;

    return (
        <div className={styles.wrapper}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th className={styles.rank}>#</th>
                        <th>Runner</th>
                        {!hideRealTime && <th>Real time</th>}
                        {!hideGameTime && <th>Game time</th>}
                        <th>Date</th>
                        <th aria-label="Video" />
                        <th aria-label="Verified" />
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {leaderboard.entries.map((entry) => (
                        <LeaderboardRow
                            key={
                                entry.runId ??
                                `${entry.runnerName}-${entry.rank}`
                            }
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
        </div>
    );
}
