import { formatCount, formatHours } from '~src/utils/format-stats';
import type { ResolvedCategory } from '../../../../../types/leaderboards.types';
import styles from './sidebar.module.scss';

interface Props {
    category: ResolvedCategory;
    /** Entry count of the board as currently viewed (leaderboard totalItems).
     * Null when no board response is loaded. */
    boardSize?: number | null;
}

/**
 * The active board's own numbers — the masthead's facts line stays
 * game-level, so this is the only place the selected category's stats
 * appear. Board view only; the overview has no single active board.
 *
 * The headline count is the BOARD SIZE, not category_stats.unique_runners.
 * unique_runners counts everyone whose timer ever synced the category —
 * including people with zero finished runs, who can never appear on the
 * board. "Runners: 8" beside a 6-row board read as two missing entries
 * (LSW:TCS 100%, 2026-08-07); on the board page, the board is the unit
 * people care about.
 */
export function BoardStatsPanel({ category, boardSize = null }: Props) {
    const attempts = category.totalAttemptCount ?? 0;
    const finished = category.totalFinishedAttemptCount ?? 0;
    if (boardSize == null && attempts === 0) return null;

    const finishedPct =
        attempts > 0 ? Math.round((finished / attempts) * 100) : null;

    return (
        <section className={styles.panel}>
            <span className={`${styles.eyebrow} d-block mb-2`}>
                Category: {category.display}
            </span>
            <dl className={styles.statList}>
                {boardSize != null && (
                    <div className={styles.statRow}>
                        <dt className={styles.statLabel}>On the board</dt>
                        <dd className={styles.statValue}>
                            {formatCount(boardSize)}
                        </dd>
                    </div>
                )}
                <div className={styles.statRow}>
                    <dt className={styles.statLabel}>Attempts</dt>
                    <dd
                        className={styles.statValue}
                        title={
                            finishedPct === null
                                ? undefined
                                : `${formatCount(finished)} finished (${finishedPct}%)`
                        }
                    >
                        {formatCount(attempts)}
                    </dd>
                </div>
                {(category.totalPbs ?? 0) > 0 && (
                    <div className={styles.statRow}>
                        <dt className={styles.statLabel}>PBs set</dt>
                        <dd className={styles.statValue}>
                            {formatCount(category.totalPbs ?? 0)}
                        </dd>
                    </div>
                )}
                <div className={styles.statRow}>
                    <dt className={styles.statLabel}>Time played</dt>
                    <dd className={styles.statValue}>
                        {formatHours(category.totalRunTime ?? 0)} h
                    </dd>
                </div>
            </dl>
        </section>
    );
}
