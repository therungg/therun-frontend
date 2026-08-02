import { formatCount, formatHours } from '~src/utils/format-stats';
import type { ResolvedCategory } from '../../../../../types/leaderboards.types';
import styles from './sidebar.module.scss';

interface Props {
    category: ResolvedCategory;
}

/**
 * The active board's own numbers — the masthead's facts line stays
 * game-level, so this is the only place the selected category's stats
 * appear. Board view only; the overview has no single active board.
 */
export function BoardStatsPanel({ category }: Props) {
    const attempts = category.totalAttemptCount ?? 0;
    const finished = category.totalFinishedAttemptCount ?? 0;
    const runners = category.uniqueRunners ?? 0;
    if (runners === 0 && attempts === 0) return null;

    const finishedPct =
        attempts > 0 ? Math.round((finished / attempts) * 100) : null;

    return (
        <section className={styles.panel}>
            <span className={`${styles.eyebrow} d-block mb-2`}>
                Category: {category.display}
            </span>
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
        </section>
    );
}
