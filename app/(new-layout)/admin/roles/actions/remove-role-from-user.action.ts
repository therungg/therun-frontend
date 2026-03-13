'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { removeRoleFromUser } from '~src/lib/roles';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { ManageableRole } from '../../../../../types/roles.types';

export async function removeRoleFromUserAction(
    userId: number,
    role: string,
    pathToRevalidate: string,
) {
    const user = await getSession();

    confirmPermission(user, 'moderate', 'roles', { role });

    await removeRoleFromUser(userId, role as ManageableRole, user.id);
    revalidatePath(pathToRevalidate);
}
