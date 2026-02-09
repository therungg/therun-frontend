'use server';

import { ManageableRole, RoleEntity } from '../../types/roles.types';
import { apiFetch } from './api-client';

export const getAllRoles = async (
    sessionId?: string,
): Promise<RoleEntity[]> => {
    return apiFetch<RoleEntity[]>('/admin/roles', { sessionId });
};

export const addRoleToUser = async (
    userId: number,
    role: ManageableRole,
    sessionId: string,
): Promise<void> => {
    await apiFetch<void>('/admin/roles/assign', {
        method: 'POST',
        body: JSON.stringify({ userId, role }),
        sessionId,
    });
};

export const removeRoleFromUser = async (
    userId: number,
    role: ManageableRole,
    sessionId: string,
): Promise<void> => {
    await apiFetch<void>('/admin/roles/remove', {
        method: 'POST',
        body: JSON.stringify({ userId, role }),
        sessionId,
    });
};
