'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { insertLog } from '~src/lib/logs';
import { addRoleToUser } from '~src/lib/roles';
import { getOrCreateUser } from '~src/lib/users';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { ManageableRole } from '../../../../../types/roles.types';

export async function addRoleToUserAction(
    userId: number,
    role: string,
    pathToRevalidate: string,
) {
    const user = await getSession();

    confirmPermission(user, 'moderate', 'roles', { role });

    await addRoleToUser(userId, role as ManageableRole);
    await insertLog({
        userId: await getOrCreateUser(user.username),
        action: 'add-role',
        entity: 'user',
        target: role,
        data: { userId, role },
    });

    revalidatePath(pathToRevalidate);
}
