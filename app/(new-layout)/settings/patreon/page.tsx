import { getBaseUrl } from '~src/actions/base-url.action';
import { getSession } from '~src/actions/session.action';
import { getUserPatreonData } from '~src/actions/user-patreon-data.action';
import buildMetadata from '~src/utils/metadata';
import styles from '../settings.module.scss';
import { LoginWithPatreon } from './login-with-patreon';
import { PatreonStatus } from './patreon-status';

export default async function PatreonSettingsPage(props: {
    searchParams: Promise<{ [_: string]: string }>;
}) {
    const searchParams = await props.searchParams;
    const session = await getSession();
    if (!session.id || !session.username) return null;
    const baseUrl = await getBaseUrl();
    const data = await getUserPatreonData(searchParams);
    const linkFailed = !!searchParams.code && !data;

    return (
        <div className={styles.pane}>
            <header className={styles.paneHeader}>
                <h1 className={styles.paneTitle}>Patreon</h1>
                <p className={styles.paneLede}>
                    Your supporter status and account link.
                </p>
            </header>
            {data?.tier ? (
                <PatreonStatus tier={data.tier} />
            ) : (
                <>
                    {linkFailed && (
                        <p role="alert">
                            Linking your Patreon account failed. Try again.
                        </p>
                    )}
                    <LoginWithPatreon session={session} baseUrl={baseUrl} />
                </>
            )}
        </div>
    );
}

export const metadata = buildMetadata({
    title: 'Patreon',
    description: 'Your Patreon supporter status and account link on therun.gg.',
    index: false,
    follow: false,
});
