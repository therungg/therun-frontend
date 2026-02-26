'use server';

import { getSession } from '~src/actions/session.action';
import { getExclusions } from '~src/lib/exclusions';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { ExclusionsPanel } from './exclusions-panel';

export default async function ExclusionsPage() {
    const user = await getSession();
    confirmPermission(user, 'edit', 'user');

    const exclusions = await getExclusions(user.id);

    return <ExclusionsPanel exclusions={exclusions} />;
}
