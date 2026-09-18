'use server';

import styles from '../admin.module.scss';
import { getSrcQueuesAction } from './actions/src-queues.action';
import { QueuesTable } from './queues-table';

export default async function SrcImportQueuesPage() {
    // The action carries the admin check; this page has no other gate.
    const queues = await getSrcQueuesAction();

    return (
        <div className={styles.pageWide}>
            <h1 className={styles.pageTitle}>Import queues</h1>
            <p className={styles.pageSubtitle}>
                Every board import, runner import and purge on the site.
            </p>
            <QueuesTable initial={queues} />
        </div>
    );
}
