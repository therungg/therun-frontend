'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { submitBoardClaim } from '~src/lib/board-claims';
import type { BoardModRole } from '../../../../../../types/board-claims.types';

interface Input {
    gameId: number;
    motivation: string;
}

export async function submitBoardClaimAction(
    input: Input,
): Promise<
    { ok: true; autoApprovedRole: BoardModRole | null } | { error: string }
> {
    const user = await getSession();
    if (!user?.username || !user.id) {
        return { error: 'Sign in to apply.' };
    }

    const motivation = input.motivation.trim();
    if (motivation.length < 10) {
        return {
            error: 'Tell the admins a little more (at least 10 characters).',
        };
    }
    if (motivation.length > 1000) {
        return { error: 'Keep your application under 1000 characters.' };
    }

    try {
        const res = await submitBoardClaim(user.id, input.gameId, motivation);
        if (!res.autoApproved) return { ok: true, autoApprovedRole: null };
        updateTag(`game-mods:${input.gameId}`);
        return { ok: true, autoApprovedRole: res.role };
    } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
            return { error: 'You already have an open application here.' };
        }
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to submit application.' };
    }
}
