'use server';

import { getSession } from '~src/actions/session.action';
import {
    type AdminModActionsFilter,
    getAdminModActions,
} from '~src/lib/admin-mod-actions';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { AdminModActionsPage } from '../../../../../types/admin-mod-actions.types';

export type LoadModActionsResult =
    | { result: AdminModActionsPage }
    | { error: string };

export async function loadModActionsAction(
    filter: AdminModActionsFilter,
): Promise<LoadModActionsResult> {
    const user = await getSession();
    confirmPermission(user, 'moderate', 'admins');

    try {
        return { result: await getAdminModActions(user.id, filter) };
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'Request failed' };
    }
}
