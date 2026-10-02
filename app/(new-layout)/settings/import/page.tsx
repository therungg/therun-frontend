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
                <p className={styles.paneLede}>
                    Download your data on speedrun.com under Settings → Account
                    → Export your data. Upload the downloaded file here, and
                    your runs will be automatically imported and added to the
                    corresponding leaderboards. We keep a copy of the file for
                    30 days.
                </p>
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
