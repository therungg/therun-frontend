import { Funnel, Trophy } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import type { LeaderboardResponse } from '../../../../../types/leaderboards.types';
import { ClearFiltersButton } from '../filters/clear-filters-button';
import { isSameRunner } from '../shared/is-same-runner';
import styles from './leaderboard.module.scss';
import { LeaderboardRow } from './leaderboard-row';
import {
    type TimingKey,
    timingColumnHidden,
    timingColumns,
} from './timing-columns';

interface Props {
    leaderboard: LeaderboardResponse;
    sessionUsername: string | null;
    canManage: boolean;
    gameSlug: string;
    variableKeys: string[];
    primaryTiming: TimingKey;
    /** True when any subcategory / variable / verified filter narrows the board. */
    filtersActive: boolean;
}

export function LeaderboardTable({
    leaderboard,
    sessionUsername,
    canManage,
    gameSlug,
    variableKeys,
    primaryTiming,
    filtersActive,
}: Props) {
    if (leaderboard.entries.length === 0) {
        return (
            <div className={styles.wrapper}>
                <div className={styles.empty}>
                    {filtersActive ? (
                        <>
                            <Funnel
                                size={28}
                                className={styles.emptyIcon}
                                aria-hidden
                            />
                            <p className={styles.emptyTitle}>
                                No runs match these filters.
                            </p>
                            <ClearFiltersButton variableKeys={variableKeys} />
                        </>
                    ) : (
                        <>
                            <Trophy
                                size={28}
                                className={styles.emptyIcon}
                                aria-hidden
                            />
                            <p className={styles.emptyTitle}>
                                No runs on this board yet.
                            </p>
                            <Link
                                href={`/games-v2/${gameSlug}/submit`}
                                className={styles.emptyAction}
                            >
                                Submit the first run
                            </Link>
                        </>
                    )}
                </div>
            </div>
        );
    }

    const { hideRealTime, hideGameTime } = leaderboard;
    const hidden = (key: TimingKey) =>
        timingColumnHidden(key, { hideRealTime, hideGameTime });
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
                            isCurrentUser={isSameRunner(
                                entry.runnerName,
                                sessionUsername,
                            )}
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
