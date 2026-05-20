'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError, apiFetch } from '~src/lib/api-client';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';

export type ExcludeScope = 'category' | 'game';

interface Input {
    gameSlug: string;
    userId: number;
    scope: ExcludeScope;
    categoryId?: number; // required when scope === 'category', ignored otherwise
    reason?: string;
}

export async function excludeUserAction(
    input: Input,
): Promise<{ ok: true } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) {
        return { error: 'Not signed in.' };
    }

    if (!(session.roles ?? []).includes('admin')) {
        return { error: 'Not authorized to exclude users.' };
    }

    if (input.scope === 'category' && input.categoryId == null) {
        return {
            error: 'categoryId is required for category-scoped exclusion.',
        };
    }

    const game = await resolveGame(input.gameSlug);
    if (!game) return { error: 'Game not found.' };

    const trimmed = input.reason?.trim();
    const body: {
        type: 'user';
        targetId: number;
        gameId: number;
        categoryId?: number;
        reason?: string;
    } = {
        type: 'user',
        targetId: input.userId,
        gameId: game.id,
    };
    if (input.scope === 'category') body.categoryId = input.categoryId;
    if (trimmed) body.reason = trimmed;

    try {
        await apiFetch<unknown>('/admin/exclusions', {
            method: 'POST',
            sessionId: session.id,
            body,
        });
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to exclude user.' };
    }

    // Per docs: exclusions don't auto-invalidate the Redis leaderboard cache.
    // Flush it so the runner disappears from the board right away.
    try {
        await apiFetch<unknown>(
            `/v1/leaderboards/invalidate-cache/${game.id}`,
            { method: 'POST', sessionId: session.id },
        );
    } catch {
        // Best-effort.
    }

    // Invalidate Next.js cache tags. Category scope → just that category;
    // game scope → every category in the game.
    try {
        const { categories } = await resolveCategory(game.id);
        const targets =
            input.scope === 'category'
                ? categories.filter((c) => c.id === input.categoryId)
                : categories;
        for (const cat of targets) {
            for (const timing of ['rt', 'gt'] as const) {
                for (const v of ['v', 'a'] as const) {
                    revalidateTag(
                        `lb:${game.name}:${cat.name}::${timing}:${v}`,
                        'minutes',
                    );
                }
            }
        }
    } catch {
        // Best-effort.
    }

    return { ok: true };
}
