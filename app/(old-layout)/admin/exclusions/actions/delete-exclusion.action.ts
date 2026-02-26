'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { apiFetch } from '~src/lib/api-client';
import { confirmPermission } from '~src/rbac/confirm-permission';

export async function deleteExclusionAction(ruleId: number) {
    const user = await getSession();
    confirmPermission(user, 'edit', 'user');

    await apiFetch(`/admin/exclusions/${ruleId}`, {
        sessionId: user.id,
        method: 'DELETE',
    });

    revalidatePath('/admin/exclusions');
}
