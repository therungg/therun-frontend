'use server';

import { getSession } from '~src/actions/session.action';
import { listMinimumTimes } from '~src/lib/leaderboard-minimums';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { MinimumTime } from '../../../../../../types/leaderboard-minimums.types';

interface Input {
    gameSlug: string;
    gameId: number;
    categorySlug: string;
    categoryId: number;
}

export async function loadCategoryDataAction(input: Input): Promise<
    | {
          result: { minimum: MinimumTime | null };
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
        const minimums = await listMinimumTimes(
            user.id,
            input.gameId,
            input.categoryId,
        );
        const minimum = minimums.find((m) => m.subcategoryHash === '') ?? null;
        return { result: { minimum } };
    } catch {
        return { error: 'Failed to load category data.' };
    }
}
