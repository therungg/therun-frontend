import { Funnel, Trophy } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { buildSubmitHref } from '~src/lib/board-url';
import type { LeaderboardResponse } from '../../../../../types/leaderboards.types';
import { ClearFiltersButton } from '../filters/clear-filters-button';
import { isSameRunner } from '../shared/is-same-runner';
import { computeDisplayRanks } from './display-rank';
import styles from './leaderboard.module.scss';
import { LeaderboardRow } from './leaderboard-row';
import {
    type TimingKey,
    timingColumnHidden,
    timingColumns,
    timingValue,
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
    /** category.showMilliseconds ?? true — precision the board is configured for. */
    showMilliseconds: boolean;
    /** Active category slug — carried into the empty-state submit link and each row's "Correct this time" link. */
    categorySlug: string;
    /** Active subcategory key — carried into the empty-state submit link. */
    subcategoryKey: string;
    /** Subcategory-role variable names, for building a row's own subcategory key from `entry.variables`. */
    subcategoryDefKeys: string[];
}

export function LeaderboardTable({
    leaderboard,
    sessionUsername,
    canManage,
    gameSlug,
    variableKeys,
    primaryTiming,
    filtersActive,
    showMilliseconds,
    categorySlug,
    subcategoryKey,
    subcategoryDefKeys,
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
                                href={buildSubmitHref(gameSlug, {
                                    categorySlug,
                                    subcategoryKey,
                                })}
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
    const { primary, secondary } = timingColumns(primaryTiming);
    // Every entry in the loaded window has no secondary time at all — hide
    // the column entirely rather than render a wall of dashes. A later page
    // introducing data re-shows it (recomputed each render, not sticky).
    const secondaryAllNull = leaderboard.entries.every(
        (e) => timingValue(e, secondary.key) == null,
    );
    const hidden = (key: TimingKey) =>
        timingColumnHidden(key, { hideRealTime, hideGameTime }) ||
        (key === secondary.key && secondaryAllNull);
    const displayRanks = computeDisplayRanks(
        leaderboard.entries,
        primaryTiming,
    );
    // Row-level hide flags need the all-null override folded into the same
    // key the secondary column actually is (rt or gt — depends on
    // primaryTiming), not blanket-applied to gameTime.
    const rowHideRealTime =
        hideRealTime || (secondary.key === 'rt' && secondaryAllNull);
    const rowHideGameTime =
        hideGameTime || (secondary.key === 'gt' && secondaryAllNull);

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
                    {leaderboard.entries.map((entry, i) => (
                        <LeaderboardRow
                            key={
                                entry.runId ??
                                `${entry.runnerName}-${entry.rank}`
                            }
                            entry={entry}
                            displayRank={displayRanks[i]}
                            isCurrentUser={isSameRunner(
                                entry.runnerName,
                                sessionUsername,
                            )}
                            canManage={canManage}
                            gameSlug={gameSlug}
                            hideRealTime={rowHideRealTime}
                            hideGameTime={rowHideGameTime}
                            primaryTiming={primaryTiming}
                            sessionUsername={sessionUsername}
                            showMilliseconds={showMilliseconds}
                            categorySlug={categorySlug}
                            subcategoryDefKeys={subcategoryDefKeys}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
