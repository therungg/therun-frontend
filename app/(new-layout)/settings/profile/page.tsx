import { getSession } from '~src/actions/session.action';
import Link from '~src/components/link';
import { getGlobalUser } from '~src/lib/get-global-user';
import { runnerProfileHref } from '~src/lib/runner-profile-href';
import buildMetadata from '~src/utils/metadata';
import styles from '../settings.module.scss';
import { ProfileForm } from './profile-form';

export default async function ProfileSettingsPage() {
    const session = await getSession();
    if (!session.id || !session.username) return null;
    const userData = await getGlobalUser(session.username);
    // The signed-in caller's own profile: absent only if the account went away
    // underneath the session (a deletion in another tab). Nothing to edit.
    if (!userData) return null;
    return (
        <div className={styles.paneWide}>
            <header className={styles.paneHeader}>
                <h1 className={styles.paneTitle}>Profile</h1>
            </header>
            <ProfileForm initial={userData} />
            <p className={styles.paneNote}>
                <Link href={`${runnerProfileHref(session.username)}?edit=1`}>
                    Arrange your Leaderboards profile
                </Link>
            </p>
        </div>
    );
}

export const metadata = buildMetadata({
    title: 'Profile settings',
    description: 'Edit your profile on therun.gg.',
    index: false,
    follow: false,
});
