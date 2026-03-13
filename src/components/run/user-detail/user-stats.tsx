import { Run } from '../../../common/types';
import styles from '../../css/User.module.scss';
import { DurationToFormatted, IsoToFormatted } from '../../util/datetime';

export const UserStats = ({ runs }: { runs: Run[] }) => {
    const totalPlayTime = runs
        .filter((run) => !!run.totalRunTime && run.totalRunTime != 'NaN')
        .map((run) => parseInt(run.totalRunTime))
        .reduce((a, b) => a + b, 0)
        .toString();
    const totalAttempts = runs
        .map((run) => run.attemptCount)
        .reduce((a, b) => a + b);
    const totalFinishedAttempts = runs
        .map((run) => run.finishedAttemptCount)
        .reduce((a, b) => a + b);
    const games = new Set(runs.map((run) => run.game)).size;

    const lastSessions = runs
        .filter((run) => run.sessions.length > 0)
        .map((run) => run.sessions[run.sessions.length - 1].endedAt)
        .sort();
    const lastSessionTime = lastSessions[lastSessions.length - 1];

    return (
        <>
            <h2 className={styles.sectionHeading}>Stats</h2>
            <div className={styles.statGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total Games</div>
                    <div className={styles.statValue}>{games}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total Categories</div>
                    <div className={styles.statValue}>{runs.length}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total time played</div>
                    <div className={styles.statValue}>
                        <DurationToFormatted duration={totalPlayTime} />
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total attempts</div>
                    <div className={styles.statValue}>{totalAttempts}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Completed attempts</div>
                    <div className={styles.statValue}>
                        {totalFinishedAttempts}
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Completion %</div>
                    <div className={styles.statValue}>
                        {(
                            (parseInt(totalFinishedAttempts) / totalAttempts) *
                            100
                        ).toFixed(2)}
                        %
                    </div>
                </div>
                <div
                    className={styles.statCard}
                    style={{ gridColumn: '1 / -1' }}
                >
                    <div className={styles.statLabel}>Last active</div>
                    <div className={styles.statValue}>
                        <IsoToFormatted iso={lastSessionTime} />
                    </div>
                </div>
            </div>
        </>
    );
};
