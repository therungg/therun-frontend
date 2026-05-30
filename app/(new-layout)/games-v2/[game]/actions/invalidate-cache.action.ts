'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError, apiFetch } from '~src/lib/api-client';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import type { Role } from '../../../../../types/session.types';

const CACHE_INVALIDATION_ROLES: Role[] = [
    'admin',
    'board-admin',
    'board-moderator',
];

interface Input {
    gameSlug: string;
    gameId: number;
    /** When true, also enqueue a rebuild of every leaderboard flag (`?rebuildAllFlags=1`). */
    rebuildAllFlags?: boolean;
}

export async function invalidateGameCacheAction(
    input: Input,
): Promise<{ ok: true } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) {
        return { error: 'Not signed in.' };
    }

    const hasGlobalRole = (session.roles ?? []).some((r) =>
        CACHE_INVALIDATION_ROLES.includes(r),
    );
    if (!hasGlobalRole) {
        return { error: 'Not authorized to invalidate game cache.' };
    }

    try {
        const query = input.rebuildAllFlags ? '?rebuildAllFlags=1' : '';
        await apiFetch<{ invalidated: { gameId: number } }>(
            `/v1/leaderboards/invalidate-cache/${input.gameId}${query}`,
            {
                method: 'POST',
                sessionId: session.id,
            },
        );
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to invalidate cache.' };
    }

    // Also invalidate the Next.js layer for every category in this game.
    // Backend just cleared its Redis layer; without this, the frontend
    // would still serve the previous response from Next's data cache.
    try {
        const game = await resolveGame(input.gameSlug);
        if (game) {
            const { categories } = await resolveCategory(game.id);
            for (const cat of categories) {
                for (const timing of ['rt', 'gt'] as const) {
                    for (const v of ['v', 'a'] as const) {
                        revalidateTag(
                            `lb:${game.name}:${cat.name}::${timing}:${v}`,
                            'minutes',
                        );
                    }
                }
            }
        }
    } catch {
        // Best-effort; backend already cleared Redis, so a stale Next
        // cache will rebuild on next read regardless.
    }

    return { ok: true };
}
