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
        const [variables, { categories }] = await Promise.all([
            listGameVariables(user.id, input.gameId),
            resolveCategory(input.gameId),
        ]);

        // Reserved params come from the public /variables endpoint. Any
        // category works — pick the first; fall back to a hardcoded list if
        // the call fails or the game has no categories.
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
                variables,
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
