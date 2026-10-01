'use server';

import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { getVariables } from '~src/lib/leaderboards-v1';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../types/leaderboards.types';

/**
 * The same board context `loadModBoardContextAction` returns, for a runner
 * acting on their OWN run — the Move dialog's category picker and its
 * subcategory bands need categories + their variable defs, and a non-mod
 * must be able to open it.
 *
 * Why this isn't just the mod loader minus its `canModerateGame` check: the
 * variables read it uses (`listCategoryVariables` →
 * `GET /v1/games/{id}/variables`) is gated on the `edit-customizations`
 * game-management permission backend-side, and that helper swallows the 403
 * and returns `[]`. A non-mod would therefore get an empty variable list and
 * a Move dialog that silently offers no subcategory bands — i.e. a move that
 * lands the run on the wrong board rather than an error. So the defs come
 * from the PUBLIC per-category variables route (`getVariables`, the same one
 * the board page itself reads), which returns published rows only — exactly
 * the set the picker may offer.
 *
 * Only the defs of the board they're moving off are fetched here; a target
 * board's come from `loadOwnerCategoryVariablesAction` once it's picked.
 * Fetching every featured board's up front was one request per board (55 on
 * SM64) on every first click, and any one of them failing failed the dialog.
 * Every read here is a cached public one; the whole call is lazy (first
 * click on Move…), same as the mod loader.
 */
export async function loadOwnerBoardContextAction(
    gameSlug: string,
    categoryId: number,
): Promise<
    | {
          ok: true;
          gameDisplay: string;
          categories: ResolvedCategory[];
          variables: VariableRow[];
      }
    | { error: string }
> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };

    try {
        const { categories } = await resolveCategory(game.id);
        const current = categories.find((c) => c.id === categoryId);
        // No `.catch(() => [])`: a category whose defs failed to load would
        // offer no subcategory bands, and the Move would land the run on the
        // wrong board while looking like it worked. That silent wrongness is
        // the entire reason this file exists — a rejection here propagates to
        // the outer catch and the dialog reports an error.
        const variables = current
            ? (await getVariables(game.name, current.name)).variables
            : [];
        return {
            ok: true,
            gameDisplay: game.display,
            categories,
            variables,
        };
    } catch {
        return { error: 'Failed to load board data.' };
    }
}

/**
 * One move target's variable defs, fetched when the runner picks that board
 * in the Move dialog. Same public route and the same no-silent-fallback rule
 * as the loader above.
 */
export async function loadOwnerCategoryVariablesAction(
    gameSlug: string,
    categoryId: number,
): Promise<{ ok: true; variables: VariableRow[] } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };

    try {
        const { categories } = await resolveCategory(game.id);
        const category = categories.find((c) => c.id === categoryId);
        if (!category) return { error: 'Board not found.' };
        const { variables } = await getVariables(game.name, category.name);
        return { ok: true, variables };
    } catch {
        return { error: "Could not load that board's options." };
    }
}
