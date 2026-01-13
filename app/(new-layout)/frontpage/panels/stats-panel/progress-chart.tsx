'use client';
import { CircularProgressbarWithChildren as CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { IconType } from 'react-icons';
import { FaCheck, FaClock, FaFlagCheckered, FaGamepad } from 'react-icons/fa6';
import { UserSummary } from '~src/types/summary.types';
import styles from './stats-panel.module.scss';

export const ProgressChart = ({ stats }: { stats: UserSummary }) => {
    const percentage =
        stats.totalRuns > 0
            ? (stats.totalFinishedRuns / stats.totalRuns) * 100
            : 0;

    const StatItem = ({
        icon: Icon,
        value,
        label,
    }: {
        icon: IconType;
        value: string | number;
        label: string;
    }) => (
        <div className={styles.statItem}>
            <div className={styles.statContent}>
                <div className={styles.statIcon}>
                    <Icon size={16} />
                </div>
                <div className={styles.statText}>
                    <div className={styles.statValue}>{value}</div>
                    <div className={styles.statLabel}>{label}</div>
                </div>
            </div>
        </div>
    );

    if (stats.totalRuns === 0) {
        return (
            <div className={styles.chartContainer}>
                <div
                    style={{
                        textAlign: 'center',
                        padding: '2rem',
                        opacity: 0.7,
                        fontSize: '0.95rem',
                    }}
                >
                    <p>No runs recorded in this period</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.chartContainer}>
            <div className={styles.circleWrapper}>
                <div className={styles.circleTitle}>Completion Rate</div>
                <div className={styles.circle}>
                    <CircularProgressbar className="mh-100" value={percentage}>
                        <div className={styles.circleContent}>
                            <span className={styles.percentage}>
                                {`${percentage.toFixed(0)}`}
                            </span>
                            <span className={styles.percentageSign}>%</span>
                        </div>
                    </CircularProgressbar>
                </div>
            </div>
            <div className={styles.statsGrid}>
                <StatItem
                    icon={FaClock}
                    value={`${(stats.totalPlaytime / 1000 / 60 / 60).toFixed(0)}h`}
                    label="Hours"
                />
                <StatItem
                    icon={FaFlagCheckered}
                    value={stats.totalFinishedRuns}
                    label="Finished"
                />
                <StatItem
                    icon={FaCheck}
                    value={stats.totalRuns}
                    label="Started"
                />
                <StatItem
                    icon={FaGamepad}
                    value={stats.races.length}
                    label="Races"
                />
            </div>
        </div>
    );
};
