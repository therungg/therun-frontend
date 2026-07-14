'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { approveBoardClaim, denyBoardClaim } from '~src/lib/board-claims';
import { resolveGame } from '~src/lib/games-v1';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { BoardModRole } from '../../../../../../../../types/board-claims.types';

interface ApproveInput {
    gameSlug: string;
    claimId: number;
    role: BoardModRole;
}

export async function approveApplicationAction(
    input: ApproveInput,
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
        await approveBoardClaim(user.id, input.claimId, input.role);
        const game = await resolveGame(input.gameSlug);
        if (game) revalidateTag(`game-mods:${game.id}`, 'minutes');
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to approve application.' };
    }
}

interface DenyInput {
    gameSlug: string;
    claimId: number;
    reason: string;
}

export async function denyApplicationAction(
    input: DenyInput,
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
        await denyBoardClaim(
            user.id,
            input.claimId,
            input.reason.trim() || undefined,
        );
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to deny application.' };
    }
}
