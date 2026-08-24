'use server';

import { getSession } from '~src/actions/session.action';
import {
    getLatestDuplicateScan,
    listDuplicateFindings,
} from '~src/lib/duplicate-runs';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { DuplicateRunsPanel } from './duplicate-runs-panel';

export default async function DuplicateRunsPage() {
    const user = await getSession();
    confirmPermission(user, 'moderate', 'admins');

    const [findings, latestScan] = await Promise.all([
        listDuplicateFindings(user.id, { state: 'open' }),
        getLatestDuplicateScan(user.id),
    ]);

    return (
        <DuplicateRunsPanel
            initialFindings={findings}
            initialScan={latestScan}
        />
    );
}
