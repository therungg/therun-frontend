import { getSession } from '~src/actions/session.action';
import { getUserPatreonData } from '~src/actions/user-patreon-data.action';
import Link from '~src/components/link';
import buildMetadata from '~src/utils/metadata';
import styles from '../settings.module.scss';
import PatreonSettings from './patreon-section';

export default async function AppearancePage(props: {
    searchParams: Promise<{ [_: string]: string }>;
}) {
    const searchParams = await props.searchParams;
    const session = await getSession();
    const data = await getUserPatreonData({});
    const isAdmin = session.roles?.includes('admin') ?? false;
    const rawTier = isAdmin ? Number(searchParams.tier) : NaN;
    const tierOverride =
        isAdmin && [1, 2, 3].includes(rawTier)
            ? (rawTier as 1 | 2 | 3)
            : undefined;

    const canCustomise = !!data?.tier || isAdmin;

    return (
        <div className={styles.pane}>
            <header className={styles.paneHeader}>
                <h1 className={styles.paneTitle}>Appearance</h1>
                <p className={styles.paneLede}>
                    How your name looks across the site.
                </p>
            </header>
            {canCustomise ? (
                <PatreonSettings
                    session={session}
                    userPatreonData={data ?? { tier: 3, preferences: null }}
                    tierOverride={tierOverride}
                />
            ) : (
                <p>
                    Name customisation is a supporter perk.{' '}
                    <Link href="/settings/patreon">Link your Patreon</Link> or{' '}
                    <Link href="/patron">become a supporter</Link>.
                </p>
            )}
        </div>
    );
}

export const metadata = buildMetadata({
    title: 'Appearance',
    description: 'Customise how your name looks across therun.gg.',
    index: false,
    follow: false,
});
