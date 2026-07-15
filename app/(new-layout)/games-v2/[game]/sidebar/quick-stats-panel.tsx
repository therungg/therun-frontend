import { DurationToFormatted } from '~src/components/util/datetime';
import type { QuickStats } from '../../../../../types/leaderboards.types';
import styles from './sidebar.module.scss';

interface Props {
    stats: QuickStats;
}

export function QuickStatsPanel({ stats }: Props) {
    return (
        <section className={styles.panel}>
            <span className={`${styles.eyebrow} d-block mb-2`}>
                Quick stats
            </span>
            <div className={styles.row}>
                <span className={styles.statLabel}>Runners</span>
                <span className={styles.statValue}>
                    {stats.uniqueRunners.toLocaleString()}
                </span>
            </div>
            <div className={styles.row}>
                <span className={styles.statLabel}>Total run time</span>
                <span className={styles.statValue}>
                    <DurationToFormatted duration={stats.totalRunTime} />
                </span>
            </div>
            <div className={styles.row}>
                <span className={styles.statLabel}>Total attempts</span>
                <span className={styles.statValue}>
                    {stats.totalAttemptCount.toLocaleString()}
                </span>
            </div>
            <div className={styles.row}>
                <span className={styles.statLabel}>Finished attempts</span>
                <span className={styles.statValue}>
                    {stats.totalFinishedAttemptCount.toLocaleString()}
                </span>
            </div>
        </section>
    );
}
