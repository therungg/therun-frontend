'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { insertLog } from '~src/lib/logs';
import { removeRoleFromUser } from '~src/lib/roles';
import { getOrCreateUser } from '~src/lib/users';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { ManageableRole } from '../../../../../types/roles.types';

export async function removeRoleFromUserAction(
    userId: number,
    role: string,
    pathToRevalidate: string,
) {
    const user = await getSession();

    confirmPermission(user, 'moderate', 'roles', { role });

    await removeRoleFromUser(userId, role as ManageableRole);
    await insertLog({
        userId: await getOrCreateUser(user.username),
        action: 'remove-role',
        entity: 'user',
        target: role,
        data: { userId, role },
    });
    revalidatePath(pathToRevalidate);
}
