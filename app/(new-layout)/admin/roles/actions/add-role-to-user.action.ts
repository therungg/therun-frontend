'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { addRoleToUser } from '~src/lib/roles';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { ManageableRole } from '../../../../../types/roles.types';

export async function addRoleToUserAction(
    userId: number,
    role: string,
    pathToRevalidate: string,
) {
    const user = await getSession();

    confirmPermission(user, 'moderate', 'roles', { role });

    await addRoleToUser(userId, role as ManageableRole, user.id);

    revalidatePath(pathToRevalidate);
}
