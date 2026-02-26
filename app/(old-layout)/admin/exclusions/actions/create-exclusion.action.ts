'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { apiFetch } from '~src/lib/api-client';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { ExclusionType } from '../../../../../types/exclusions.types';

export async function createExclusionAction(
    type: ExclusionType,
    targetId: number,
    reason?: string,
) {
    const user = await getSession();
    confirmPermission(user, 'edit', 'user');

    await apiFetch('/admin/exclusions', {
        sessionId: user.id,
        method: 'POST',
        body: JSON.stringify({ type, targetId, reason }),
    });

    revalidatePath('/admin/exclusions');
}
