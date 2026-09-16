'use client';

import { getFormattedString } from '~src/components/util/datetime';
import type { WaitingRun } from '../../../types/pb-submission.types';
import { AddVideoField } from './add-video-field';
import { videoRuleText } from './waiting-copy';
import styles from './waiting-on-you.module.scss';

/** One run that is off its board until its runner adds a video, with the fix inline. */
export function NeedsVideoLine({
    run,
    label = 'Your new PB',
}: {
    run: WaitingRun;
    label?: string;
}) {
    return (
        <div className={styles.needsVideo}>
            <div className={styles.needsVideoHead}>
                <span>
                    {label}{' '}
                    <span className={styles.needsVideoTime}>
                        {getFormattedString(String(run.timeMs))}
                    </span>{' '}
                    would be #{run.wouldBeRank}. It is off the board until you
                    add a video.
                </span>
                <span className={styles.needsVideoRule}>
                    {videoRuleText(run.videoRule)}
                </span>
            </div>
            <AddVideoField runId={run.runId} />
        </div>
    );
}
