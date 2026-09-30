import { Suspense } from 'react';
import buildMetadata from '~src/utils/metadata';
import styles from '../tools.module.scss';
import { RetimeTool } from './retime-tool';

export const metadata = buildMetadata({
    title: 'Retime',
    description:
        'Frame-accurate retiming of a Twitch or YouTube VOD: mark the first and last frame of a run and get its time.',
});

export default function RetimePage() {
    return (
        <div className={`${styles.page} ${styles.pageWide}`}>
            <div className={styles.header}>
                <h1 className={styles.pageTitle}>Retime</h1>
                <p className={styles.subtitle}>
                    Paste a Twitch or YouTube VOD URL, enter the expected time
                    (RTA), select the first frame, go to the end and mark the
                    end frame.
                </p>
            </div>
            <Suspense>
                <RetimeTool />
            </Suspense>
        </div>
    );
}
