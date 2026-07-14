'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { assignRole, revokeRoleAssignment } from '~src/lib/role-assignments';
import { getPaginatedUsers } from '~src/lib/users';
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
    | { result: { userId: number; username: string; assignmentId: number } }
    | { error: string }
> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'moderators', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Only board admins can manage the mod team.' };
    }

    const trimmed = input.username.trim();
    if (!trimmed) return { error: 'Username is required.' };

    try {
        const search = await getPaginatedUsers(1, 10, trimmed, '', user.id);
        const match = search.items.find(
            (u) => u.username.toLowerCase() === trimmed.toLowerCase(),
        );
        if (!match) return { error: `User "${trimmed}" not found.` };

        const res = await assignRole(
            { userId: match.id, role: input.role, gameId: input.gameId },
            user.id,
        );
        revalidateTag(`game-mods:${input.gameId}`, 'minutes');
        return {
            result: {
                userId: match.id,
                username: match.username,
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
