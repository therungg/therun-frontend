import { getSession } from '~src/actions/session.action';
import { getGlobalUser } from '~src/lib/get-global-user';
import buildMetadata from '~src/utils/metadata';
import styles from '../settings.module.scss';
import { ProfileForm } from './profile-form';

export default async function ProfileSettingsPage() {
    const session = await getSession();
    if (!session.id || !session.username) return null;
    const userData = await getGlobalUser(session.username);
    return (
        <div className={styles.pane}>
            <header className={styles.paneHeader}>
                <h1 className={styles.paneTitle}>Profile</h1>
                <p className={styles.paneLede}>
                    What other runners see on your profile page.
                </p>
            </header>
            <ProfileForm initial={userData} />
        </div>
    );
}

export const metadata = buildMetadata({
    title: 'Profile settings',
    description: 'Edit your profile on therun.gg.',
    index: false,
    follow: false,
});
