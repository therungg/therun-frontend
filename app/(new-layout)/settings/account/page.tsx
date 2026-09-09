import { getSession } from '~src/actions/session.action';
import buildMetadata from '~src/utils/metadata';
import paneStyles from '../settings.module.scss';
import styles from './account.module.scss';
import { DeleteAccountPanel } from './delete-account-panel';

export default async function AccountSettings() {
    const session = await getSession();
    if (!session.id || !session.username) return null;

    return (
        <div className={paneStyles.pane}>
            <header className={paneStyles.paneHeader}>
                <h1 className={paneStyles.paneTitle}>Account</h1>
                <p className={paneStyles.paneLede}>
                    What happens to your data if you delete your account.
                </p>
            </header>

            <ul className={styles.effects}>
                <li>
                    Your profile — avatar, Twitch login link, country, imported
                    speedrun links, preferences — is removed right away, and
                    you&apos;re signed out. Splits, layouts, snapshots,
                    notifications, follows, personal stats and unlisted runs
                    follow in the background, usually within a few minutes. Your
                    username is freed for anyone to register, including you.
                </li>
                <li>
                    Runs already listed on a leaderboard, and race results you
                    took part in, stay in place under an anonymous name instead
                    of your own — removing them would change other runners&apos;
                    placements and ratings. Your own rating history is removed,
                    so a race result can outlive the rating it earned you.
                </li>
                <li>
                    Signing in again afterward creates a brand new, empty
                    account. Nothing about the old one comes back.
                </li>
                <li>There is no undo once this succeeds.</li>
            </ul>

            <DeleteAccountPanel username={session.username} />
        </div>
    );
}

export const metadata = buildMetadata({
    title: 'Account',
    description: 'Delete your account and your data.',
    index: false,
    follow: false,
});
