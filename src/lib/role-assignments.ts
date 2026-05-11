'use server';

import {
    GameMgmtRole,
    RoleAssignment,
} from '../../types/role-assignments.types';
import { apiFetch } from './api-client';

export async function listGlobalRoleAssignments(
    sessionId: string,
): Promise<RoleAssignment[]> {
    return apiFetch<RoleAssignment[]>('/roles/global', { sessionId });
}

export async function listRoleAssignmentsForUser(
    userId: number,
): Promise<RoleAssignment[]> {
    return apiFetch<RoleAssignment[]>(`/roles/user/${userId}`);
}

export async function assignRole(
    body: {
        userId: number;
        role: GameMgmtRole;
        seriesId?: number;
        gameId?: number;
        categoryId?: number;
    },
    sessionId: string,
): Promise<{ id: number }> {
    return apiFetch<{ id: number }>('/roles/assign', {
        method: 'POST',
        body: JSON.stringify(body),
        sessionId,
    });
}

export async function revokeRoleAssignment(
    assignmentId: number,
    sessionId: string,
): Promise<void> {
    await apiFetch<void>(`/roles/${assignmentId}`, {
        method: 'DELETE',
        sessionId,
    });
}
