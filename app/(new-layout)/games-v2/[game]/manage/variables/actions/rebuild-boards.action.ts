'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError, apiFetch } from '~src/lib/api-client';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
}

/**
 * Queues a leaderboard rebuild for this game, which is what applies a variable
 * change to runs that already exist. Gated on the same per-game permission the
 * variable edit itself needs — the backend was widened to match (see the
 * backend's handleInvalidateCache), because the person told "runs move on the
 * next rebuild" has to be able to trigger one.
 */
export async function rebuildBoardsAction(
    input: Input,
): Promise<{ ok: true } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to rebuild this game.' };
    }

    try {
        await apiFetch<unknown>(
            `/v1/leaderboards/invalidate-cache/${input.gameId}`,
            { method: 'POST', sessionId: user.id },
        );
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Could not start the rebuild.' };
    }
}
