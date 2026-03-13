import { Run } from '../../../common/types';
import styles from '../../css/User.module.scss';
import { DurationToFormatted } from '../../util/datetime';
import { StarFilledInIcon } from '../user-detail/user-overview';
import { Vod } from './vod';

export const HighlightedRun = ({ run }: { run: Run }) => {
    return (
        <div className={styles.highlightedRun}>
            <h2 className={styles.sectionHeading}>
                <StarFilledInIcon /> {run.game} - {run.run}
            </h2>
            <div style={{ height: run.vod ? '300px' : '' }}>
                <span className={styles.statLabel}>PB</span>{' '}
                <span className={styles.statValue}>
                    <DurationToFormatted
                        duration={
                            run.hasGameTime
                                ? `${run.gameTimeData?.personalBest} (IGT)`
                                : run.personalBest
                        }
                    />
                </span>{' '}
                {run.hasGameTime && ' (IGT)'}
                {run.vod && <Vod vod={run.vod} />}
            </div>
        </div>
    );
};
