import { UserStats } from '~app/(new-layout)/races/races.types';
import styles from '~src/components/css/User.module.scss';
import { DurationToFormatted } from '~src/components/util/datetime';

export const UserRaceStatsTable = ({ raceStats }: { raceStats: UserStats }) => {
    return (
        <div className={styles.statGrid}>
            <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Races</div>
                <div className={styles.statValue}>{raceStats.totalRaces}</div>
            </div>
            <div className={styles.statCard}>
                <div className={styles.statLabel}>Finished Races</div>
                <div className={styles.statValue}>
                    {raceStats.totalFinishedRaces}
                </div>
            </div>
            <div className={styles.statCard}>
                <div className={styles.statLabel}>Finished %</div>
                <div className={styles.statValue}>
                    {(
                        (raceStats.totalFinishedRaces / raceStats.totalRaces) *
                        100
                    ).toFixed(0)}
                    %
                </div>
            </div>
            <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Race Time</div>
                <div className={styles.statValue}>
                    <DurationToFormatted duration={raceStats.totalRaceTime} />
                </div>
            </div>
        </div>
    );
};
