'use server';

import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { listGlobalRoleAssignments } from '~src/lib/role-assignments';
import { getPaginatedUsers } from '~src/lib/users';
import { RoleTeamClient } from './role-team-client';

export default async function RoleTeamPage() {
    const session = await getSession();
    if (!session.roles?.includes('admin')) {
        notFound();
    }

    const [adminsPage, assignments] = await Promise.all([
        getPaginatedUsers(1, 100, '', 'admin', session.id),
        listGlobalRoleAssignments(session.id),
    ]);

    const siteAdmins = adminsPage.items.map((u) => ({
        id: u.id,
        username: u.username,
    }));
    const globalAdmins = assignments.filter((a) => a.role === 'global-admin');

    return (
        <RoleTeamClient siteAdmins={siteAdmins} globalAdmins={globalAdmins} />
    );
}
