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
    categoryId?: number | null;
}

interface LoadResult {
    variables: VariableRow[];
    reservedParams: string[];
    categories: { id: number; display: string; name: string }[];
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
        // Backend lists by scope: one call returns game-wide (categoryId IS
        // NULL) rows, another returns rows for a specific category. Fetch both
        // in parallel when a category is selected so the section can show
        // either tab without refetching.
        const [gameWide, categorySpecific, { categories }] = await Promise.all([
            listGameVariables(user.id, input.gameId, null),
            input.categoryId != null
                ? listGameVariables(user.id, input.gameId, input.categoryId)
                : Promise.resolve<VariableRow[]>([]),
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
        const firstCategory = categories[0];
        if (firstCategory) {
            try {
                const resp = await getVariables(
                    input.gameSlug,
                    firstCategory.name,
                );
                if (resp.reservedParams.length > 0) {
                    reservedParams = resp.reservedParams;
                }
            } catch {
                // Keep the fallback.
            }
        }

        return {
            result: {
                variables: [...gameWide, ...categorySpecific],
                reservedParams,
                categories: categories.map((c) => ({
                    id: c.id,
                    display: c.display,
                    name: c.name,
                })),
            },
        };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        if (e instanceof V1FetchError) {
            return { error: `${e.status}: ${e.message}` };
        }
        return { error: 'Failed to load variables.' };
    }
}
