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
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.pageTitle}>Retime</h1>
                <p className={styles.subtitle}>
                    Paste a Twitch or YouTube VOD, mark the first and last frame
                    of the run, and read off its time.
                </p>
            </div>
            <Suspense>
                <RetimeTool />
            </Suspense>
        </div>
    );
}
