import { getSession } from '~src/actions/session.action';
import { getMyImportJob } from '~src/actions/src-import.action';
import { getMySyncStatus } from '~src/actions/src-sync.action';
import buildMetadata from '~src/utils/metadata';
import styles from '../settings.module.scss';
import { ImportPanel } from './import-panel';
import { SyncPanel } from './sync-panel';

export default async function ImportPage() {
    const session = await getSession();
    if (!session.id) return null;
    const [sync, exportJob] = await Promise.all([
        getMySyncStatus(),
        getMyImportJob(),
    ]);
    return (
        <div className={styles.pane}>
            <header className={styles.paneHeader}>
                <h1 className={styles.paneTitle}>Import from speedrun.com</h1>
            </header>
            {'error' in sync ? (
                <p>{sync.error}</p>
            ) : (
                <SyncPanel initial={sync.status} />
            )}
            {'job' in exportJob && exportJob.job && (
                <ImportPanel initialJob={exportJob.job} />
            )}
        </div>
    );
}

export const metadata = buildMetadata({
    title: 'Import from speedrun.com',
    description: 'Sync your runs from speedrun.com.',
    index: false,
    follow: false,
});
