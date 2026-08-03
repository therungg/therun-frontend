'use server';

import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listCategoryVariables } from '~src/lib/leaderboard-variables';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../types/leaderboards.types';

/**
 * Board context the console dialogs (Move/Adjust/Runner) need, loaded
 * lazily when a mod first opens one from the public board's row menu — the
 * public leaderboard payload stays visitor-sized; only mods pay for this.
 */
export async function loadModBoardContextAction(
    gameSlug: string,
): Promise<
    | { ok: true; categories: ResolvedCategory[]; variables: VariableRow[] }
    | { error: string }
> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        const { categories } = await resolveCategory(game.id);
        // Move/Adjust dialogs can target any category, so every category's
        // variables load here (they are category-scoped only).
        const variables = await listCategoryVariables(
            session.id,
            game.id,
            categories.map((c) => c.id),
        );
        return { ok: true, categories, variables };
    } catch {
        return { error: 'Failed to load board data.' };
    }
}
