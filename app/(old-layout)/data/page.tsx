import { Metadata } from 'next';
import { getSession } from '~src/actions/session.action';
import { confirmPermission } from '~src/rbac/confirm-permission';
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
        <div>
            <h2 className="fw-bold mb-4">Stats Explorer</h2>
            <StatsExplorer />
        </div>
    );
}
