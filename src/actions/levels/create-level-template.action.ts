'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import type { PrimaryTiming } from '~src/lib/category-mgmt';
import { createLevelTemplate } from '~src/lib/levels';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    display: string;
    primaryTiming?: PrimaryTiming;
    gameTimeLabel?: string;
    rules?: string;
    requireVideo?: boolean;
    showMilliseconds?: boolean;
    isMain?: boolean;
}

export async function createLevelTemplateAction(
    input: Input,
): Promise<{ result: { id: number; created: number } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to manage category groups.' };
    }

    const { gameSlug: _gameSlug, gameId, ...body } = input;

    try {
        // createLevelTemplate defaults isMain: true, and materialise copies
        // the template's isMain onto its instances, so level boards created
        // via a subcategory template are already featured with no extra
        // work here.
        const result = await createLevelTemplate(user.id, gameId, body);
        updateTag(`game-cats:${gameId}`);
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to create level template.' };
    }
}
