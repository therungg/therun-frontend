'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { resolveCategory } from '~src/lib/games-v1';
import { listGameVariables } from '~src/lib/leaderboard-variables';
import { getVariables } from '~src/lib/leaderboards-v1';
import { V1FetchError } from '~src/lib/v1-fetch';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
}

interface LoadResult {
    variables: VariableRow[];
    reservedParams: string[];
}

export async function loadVariablesAction(
    input: Input,
): Promise<{ result: LoadResult } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    try {
        // Variables are category-scoped only: the admin list for this
        // category is the whole story.
        const [variables, { categories }] = await Promise.all([
            listGameVariables(user.id, input.gameId, input.categoryId),
            resolveCategory(input.gameId),
        ]);

        let reservedParams: string[] = [
            'combined',
            'verified',
            'country',
            'year',
            'page',
            'pagesize',
            'timing',
            'view',
        ];
        const category = categories.find((c) => c.id === input.categoryId);
        if (category) {
            try {
                const resp = await getVariables(input.gameSlug, category.name);
                if (resp.reservedParams.length > 0) {
                    reservedParams = resp.reservedParams;
                }
            } catch {
                // Keep the fallback.
            }
        }

        return { result: { variables, reservedParams } };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        if (e instanceof V1FetchError) {
            return { error: `${e.status}: ${e.message}` };
        }
        return { error: 'Failed to load variables.' };
    }
}
