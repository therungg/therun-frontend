'use server';

import { getSession } from '~src/actions/session.action';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { SrcIdentityForm } from './src-identity-form';

export default async function SrcIdentityPage() {
    const user = await getSession();
    confirmPermission(user, 'moderate', 'admins');

    return <SrcIdentityForm />;
}
