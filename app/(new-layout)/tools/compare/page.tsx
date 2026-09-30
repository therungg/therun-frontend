import { Suspense } from 'react';
import buildMetadata from '~src/utils/metadata';
import styles from '../tools.module.scss';
import { CompareTool } from './compare-tool';

export const metadata = buildMetadata({
    title: 'Compare runners',
    description:
        'Compare the splits of any two runners in the same speedrun category, split by split.',
});

export default function ComparePage() {
    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.pageTitle}>Compare runners</h1>
                <p className={styles.subtitle}>
                    Pick a game and a category, then two runners to put their
                    splits side by side.
                </p>
            </div>
            <Suspense>
                <CompareTool />
            </Suspense>
        </div>
    );
}
