import { getSession } from '~src/actions/session.action';
import { getSrcIdentitySuggestion } from '~src/actions/src-identity-claim.action';
import { getMyImportJob } from '~src/actions/src-import.action';
import buildMetadata from '~src/utils/metadata';
import styles from '../settings.module.scss';
import { ClaimCard } from './claim-card';
import { ImportPanel } from './import-panel';

export default async function ImportPage() {
    const session = await getSession();
    if (!session.id) return null;
    const [res, suggestion] = await Promise.all([
        getMyImportJob(),
        getSrcIdentitySuggestion(),
    ]);
    return (
        <div className={styles.pane}>
            <header className={styles.paneHeader}>
                <h1 className={styles.paneTitle}>Import from speedrun.com</h1>
                <p className={styles.paneLede}>
                    Download your data on speedrun.com under Settings → Account
                    → Export your data. Upload the downloaded file here. Once an
                    admin has checked the runs in it, your runs are imported and
                    added to the corresponding leaderboards. We keep the runs
                    from the file for 30 days, not the file itself. If your runs
                    are already here from the speedrun.com archive, they become
                    yours once an admin has checked them. The file is your own
                    data. In the EU you have the right to use it here (GDPR
                    article 20). Outside the EU, speedrun.com&apos;s terms may
                    not allow it, so check them first.
                </p>
            </header>
            {suggestion && <ClaimCard suggestion={suggestion} />}
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
