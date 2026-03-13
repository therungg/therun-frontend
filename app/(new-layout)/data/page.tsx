import { Metadata } from 'next';
import { getSession } from '~src/actions/session.action';
import { confirmPermission } from '~src/rbac/confirm-permission';
import styles from './data.module.scss';
import { StatsExplorer } from './stats-explorer';

export const metadata: Metadata = {
    title: 'Stats Explorer - therun.gg',
    description:
        'Explore speedrunning statistics across games, categories, and runners',
};

export default async function StatsExplorerPage() {
    const user = await getSession();
    confirmPermission(user, 'view-restricted', 'admins');

    return (
        <div className={styles.page}>
            <h2 className={styles.pageTitle}>Stats Explorer</h2>
            <StatsExplorer />
        </div>
    );
}
