import { Metadata } from 'next';
import { getSession } from '~src/actions/session.action';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { DataExplorer } from './data-explorer';

export const metadata: Metadata = {
    title: 'Data Explorer - therun.gg',
    description: 'Explore speedrunning statistics with custom queries',
};

export default async function DataExplorerPage() {
    const user = await getSession();
    confirmPermission(user, 'moderate', 'roles');

    return (
        <div>
            <h1>Data Explorer</h1>
            <p className="text-secondary">
                Build custom queries to explore speedrunning data.
            </p>
            <DataExplorer />
        </div>
    );
}
