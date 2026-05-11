'use server';

import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { listGlobalRoleAssignments } from '~src/lib/role-assignments';
import { RoleAssignmentsClient } from './role-assignments-client';

export default async function RoleAssignmentsPage() {
    const session = await getSession();
    if (!session.roles?.includes('admin')) {
        notFound();
    }

    const assignments = await listGlobalRoleAssignments(session.id);
    const globalAdmins = assignments.filter((a) => a.role === 'global-admin');

    return <RoleAssignmentsClient globalAdmins={globalAdmins} />;
}
