import { getSession } from '~src/actions/session.action';
import { getMyImportJob } from '~src/actions/src-import.action';
import buildMetadata from '~src/utils/metadata';
import styles from '../settings.module.scss';
import { ImportPanel } from './import-panel';

export default async function ImportPage() {
    const session = await getSession();
    if (!session.id) return null;
    const res = await getMyImportJob();
    return (
        <div className={styles.pane}>
            <header className={styles.paneHeader}>
                <h1 className={styles.paneTitle}>Import from speedrun.com</h1>
            </header>
            <ImportPanel
                initialJob={'error' in res ? null : res.job}
                initialError={'error' in res ? res.error : null}
            />
        </div>
    );
}

export const metadata = buildMetadata({
    title: 'Import from speedrun.com',
    description: 'Import your runs from a speedrun.com data export.',
    index: false,
    follow: false,
});
