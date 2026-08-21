import { getSession } from '~src/actions/session.action';
import { getUserPreferences } from '~src/lib/user-preferences';
import buildMetadata from '~src/utils/metadata';
import styles from '../settings.module.scss';
import { GeneralPreferences } from './general-preferences';

export default async function PreferencesPage() {
    const session = await getSession();
    const prefs = await getUserPreferences(session.user);
    return (
        <div className={styles.pane}>
            <header className={styles.paneHeader}>
                <h1 className={styles.paneTitle}>General preferences</h1>
            </header>
            <GeneralPreferences hideStreaks={prefs.hideStreaks ?? false} />
        </div>
    );
}

export const metadata = buildMetadata({
    title: 'General preferences',
    description: 'Manage your general preferences on therun.gg.',
    index: false,
    follow: false,
});
