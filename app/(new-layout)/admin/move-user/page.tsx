'use server';

import { getSession } from '~src/actions/session.action';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { MoveUserForm } from './move-user-form';

export default async function MoveUserPage() {
    const user = await getSession();
    confirmPermission(user, 'moderate', 'roles');

    return <MoveUserForm />;
}
