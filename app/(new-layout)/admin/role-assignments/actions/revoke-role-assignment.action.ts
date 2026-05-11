'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { revokeRoleAssignment } from '~src/lib/role-assignments';

const PAGE_PATH = '/admin/role-assignments';

export async function revokeRoleAssignmentAction(
    assignmentId: number,
): Promise<void> {
    const session = await getSession();
    if (!session.roles?.includes('admin')) {
        throw new Error('Forbidden: admin role required');
    }

    await revokeRoleAssignment(assignmentId, session.id);
    revalidatePath(PAGE_PATH);
}
