'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { upsertMinimumTime } from '~src/lib/leaderboard-minimums';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { UpsertMinimumTimeResult } from '../../../../../../../types/leaderboard-minimums.types';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    subcategoryHash: string;
    minTimeMs: number | null;
    minGameTimeMs: number | null;
}

export async function upsertMinimumAction(
    input: Input,
): Promise<{ result: UpsertMinimumTimeResult } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    if (input.minTimeMs === null && input.minGameTimeMs === null) {
        return { error: 'At least one of RT or GT minimum must be set.' };
    }
    for (const v of [input.minTimeMs, input.minGameTimeMs]) {
        if (v !== null && (!Number.isFinite(v) || v < 0)) {
            return { error: 'Minimum times must be non-negative numbers.' };
        }
    }

    try {
        const result = await upsertMinimumTime(
            user.id,
            input.gameId,
            input.categoryId,
            {
                subcategoryHash: input.subcategoryHash,
                minTimeMs: input.minTimeMs,
                minGameTimeMs: input.minGameTimeMs,
            },
        );
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to save minimum time.' };
    }
}
