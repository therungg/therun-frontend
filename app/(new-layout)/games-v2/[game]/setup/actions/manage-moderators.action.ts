'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { assignRole, revokeRoleAssignment } from '~src/lib/role-assignments';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { BoardModRole } from '../../../../../../types/board-claims.types';

interface AddInput {
    gameSlug: string;
    gameId: number;
    username: string;
    role: BoardModRole;
}

export async function addGameModeratorAction(
    input: AddInput,
): Promise<
    { result: { username: string; assignmentId: number } } | { error: string }
> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'moderators', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Only board admins can manage the mod team.' };
    }

    if (input.role !== 'game-admin' && input.role !== 'game-mod') {
        return { error: 'Invalid role.' };
    }

    const trimmed = input.username.trim();
    if (!trimmed) return { error: 'Username is required.' };

    try {
        // The backend resolves username -> userId itself (per-game admins are
        // gated on staff-only user search, so we can't look it up client-side).
        const res = await assignRole(
            { username: trimmed, role: input.role, gameId: input.gameId },
            user.id,
        );
        revalidateTag(`game-mods:${input.gameId}`, 'minutes');
        return {
            result: {
                username: trimmed,
                assignmentId: res.id,
            },
        };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to add moderator.' };
    }
}

interface RemoveInput {
    gameSlug: string;
    gameId: number;
    assignmentId: number;
}

export async function removeGameModeratorAction(
    input: RemoveInput,
): Promise<{ ok: true } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'moderators', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Only board admins can manage the mod team.' };
    }

    try {
        await revokeRoleAssignment(input.assignmentId, user.id);
        revalidateTag(`game-mods:${input.gameId}`, 'minutes');
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to remove moderator.' };
    }
}
