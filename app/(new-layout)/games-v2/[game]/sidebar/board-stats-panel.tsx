import type { BoardWeeklyActivity } from '~src/lib/board-activity';
import { formatCount, formatHours } from '~src/utils/format-stats';
import type { ResolvedCategory } from '../../../../../types/leaderboards.types';
import styles from './sidebar.module.scss';
import { Sparkline } from './sparkline';

interface Props {
    category: ResolvedCategory;
    /** Weekly series for this board; null when the activity fetch failed. */
    activity: BoardWeeklyActivity[] | null;
}

/**
 * The active board's own numbers — the masthead's facts line stays
 * game-level, so this is the only place the selected category's stats
 * appear. Board view only; the overview has no single active board.
 */
export function BoardStatsPanel({ category, activity }: Props) {
    const attempts = category.totalAttemptCount ?? 0;
    const finished = category.totalFinishedAttemptCount ?? 0;
    const runners = category.uniqueRunners ?? 0;
    if (runners === 0 && attempts === 0) return null;

    const finishedPct =
        attempts > 0 ? Math.round((finished / attempts) * 100) : null;
    const weekly = activity ?? [];
    const anyActivity = weekly.some((w) => w.totalAttempts > 0);
    const recentPbs = weekly.slice(-4).reduce((sum, w) => sum + w.totalPbs, 0);

    return (
        <section className={styles.panel}>
            <span className={`${styles.eyebrow} d-block mb-2`}>This board</span>
            <dl className={styles.statList}>
                <div className={styles.statRow}>
                    <dt className={styles.statLabel}>Runners</dt>
                    <dd className={styles.statValue}>{formatCount(runners)}</dd>
                </div>
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
            {anyActivity && (
                <div className={styles.sparkBlock}>
                    <Sparkline
                        values={weekly.map((w) => w.totalAttempts)}
                        partialLast={weekly[weekly.length - 1]?.partial}
                        label={`Attempts per week over the last ${weekly.length} weeks`}
                    />
                    <span className={styles.sparkCaption}>
                        Attempts per week · {weekly.length} wk
                        {recentPbs > 0 &&
                            ` · ${formatCount(recentPbs)} PB${recentPbs === 1 ? '' : 's'} in 4 wk`}
                    </span>
                </div>
            )}
        </section>
    );
}
