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
    abbreviation?: string | null;
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
    if (input.abbreviation !== undefined) {
        body.abbreviation = input.abbreviation;
    }

    if (Object.keys(body).length === 0) {
        return { result: { updated: false } };
    }

    try {
        const result = await updateGame(user.id, input.gameId, body);
        revalidateTag(`game-resolve:${input.gameSlug}`, 'hours');
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to update game identifiers.' };
    }
}
