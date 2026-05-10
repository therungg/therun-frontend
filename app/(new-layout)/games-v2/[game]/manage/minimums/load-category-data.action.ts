'use server';

import { getSession } from '~src/actions/session.action';
import { listMinimumTimes } from '~src/lib/leaderboard-minimums';
import { getVariables } from '~src/lib/leaderboards-v1';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { MinimumTime } from '../../../../../../types/leaderboard-minimums.types';
import type { VariableDef } from '../../../../../../types/leaderboards.types';

interface Input {
    gameSlug: string;
    gameId: number;
    categorySlug: string;
    categoryId: number;
}

export async function loadCategoryDataAction(input: Input): Promise<
    | {
          result: { variables: VariableDef[]; minimums: MinimumTime[] };
      }
    | { error: string }
> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized.' };
    }

    try {
        const [variables, minimums] = await Promise.all([
            getVariables(input.gameSlug, input.categorySlug),
            listMinimumTimes(user.id, input.gameId, input.categoryId),
        ]);
        return { result: { variables, minimums } };
    } catch {
        return { error: 'Failed to load category data.' };
    }
}
