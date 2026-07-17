import type { LeaderboardResponse } from '../../../../../types/leaderboards.types';
import { ClearFiltersButton } from '../filters/clear-filters-button';
import styles from './leaderboard.module.scss';
import { LeaderboardRow } from './leaderboard-row';
import { type TimingKey, timingColumns } from './timing-columns';

interface Props {
    leaderboard: LeaderboardResponse;
    sessionUsername: string | null;
    canManage: boolean;
    gameSlug: string;
    variableKeys: string[];
    primaryTiming: TimingKey;
}

export function LeaderboardTable({
    leaderboard,
    sessionUsername,
    canManage,
    gameSlug,
    variableKeys,
    primaryTiming,
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
    const hidden = (key: TimingKey) =>
        key === 'rt' ? hideRealTime : hideGameTime;
    const { primary, secondary } = timingColumns(primaryTiming);

    return (
        <div className={styles.wrapper}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th className={styles.rank}>#</th>
                        <th>Runner</th>
                        {!hidden(primary.key) && (
                            <th
                                className={styles.rankedHeader}
                                aria-label={`${primary.label} — ranking column`}
                            >
                                {primary.label}
                                <span
                                    className={styles.rankedTag}
                                    aria-hidden="true"
                                >
                                    Ranked
                                </span>
                            </th>
                        )}
                        {!hidden(secondary.key) && (
                            <th className={styles.secondaryHeader}>
                                {secondary.label}
                            </th>
                        )}
                        <th>When</th>
                        <th aria-label="Video, status and actions" />
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
                            primaryTiming={primaryTiming}
                            sessionUsername={sessionUsername}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
