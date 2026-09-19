'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { UpdateGameBody, updateGame } from '~src/lib/game-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    slug?: string | null;
}

export async function updateIdentifiersAction(
    input: Input,
): Promise<{ result: { updated: boolean } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit game identifiers.' };
    }

    const body: UpdateGameBody = {};
    if (input.slug !== undefined) body.slug = input.slug;

    if (Object.keys(body).length === 0) {
        return { result: { updated: false } };
    }

    try {
        const result = await updateGame(user.id, input.gameId, body);
        // Both spellings: the one this page was reached by, and the one the
        // game just claimed — which resolved to whoever held it before, and
        // would keep doing so for hours. The backend drops its own copy of
        // the same answer; this is the near half of the chain.
        for (const tag of new Set(
            [input.gameSlug, input.slug].filter(
                (s): s is string => typeof s === 'string' && s.length > 0,
            ),
        )) {
            revalidateTag(`game-resolve:${tag}`, 'hours');
        }
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to update game identifiers.' };
    }
}
