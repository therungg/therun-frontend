import { getSession } from '~src/actions/session.action';
import {
    getMySyncStatus,
    retryMySyncLookup,
} from '~src/actions/src-import.action';
import buildMetadata from '~src/utils/metadata';
import styles from '../settings.module.scss';
import { SyncSettings } from './sync-settings';

export default async function SyncSettingsPage() {
    const session = await getSession();
    if (!session.id || !session.username) return null;
    let res = await getMySyncStatus();
    // Matching only happens here, never in the background: an unlinked runner
    // with no result yet, or a failed one, gets a fresh attempt on each visit.
    // The API holds a 5-minute cooldown, so a reload does not repeat it.
    if (
        !('error' in res) &&
        !res.status.identity &&
        !res.status.optOut &&
        (res.status.lookupResult === null ||
            res.status.lookupResult === 'no-match')
    ) {
        const retried = await retryMySyncLookup();
        if (!('error' in retried)) res = retried;
    }
    return (
        <div className={styles.paneWide}>
            <header className={styles.paneHeader}>
                <h1 className={styles.paneTitle}>Run sync</h1>
            </header>
            {'error' in res ? (
                <p>{res.error}</p>
            ) : (
                <SyncSettings initial={res.status} />
            )}
        </div>
    );
}

export const metadata = buildMetadata({
    title: 'Run sync settings',
    description: 'Control the automatic sync of your speedrun.com runs.',
    index: false,
    follow: false,
});
