'use server';

import { getLeaderboard } from '~src/lib/leaderboards-v1';

/**
 * What the submit dialog needs to know about the board a runner just picked:
 * does it credit teams, how many runners does it credit, and is that answer
 * about this slice or about the category as a whole.
 */
export interface BoardPlayers {
    players: { min: number; max: number | null } | null;
    coopBoard: boolean;
    /** `"slice"` — the answer is this board's own. `"category"` — it is the
     * category-wide resolution and says nothing about this slice, so the
     * dialog must not offer partner fields off it (guide §5). */
    playersScope: 'slice' | 'category' | null;
}

const NOT_COOP: BoardPlayers = {
    players: null,
    coopBoard: false,
    playersScope: null,
};

/**
 * The board's players policy for the slice the dialog is pointed at.
 *
 * Read off the ordinary cached board fetcher rather than a request of its
 * own: the backend resolves `players`/`coopBoard`/`playersScope` per board
 * request, outside its own entry cache, and a policy write drops the coarse
 * per-category tag this read is filed under — so the dialog is current the
 * moment a moderator changes what the board credits. One row is asked for
 * because nothing here reads the entries.
 *
 * A board whose policy cannot be read does not block a submission (guide
 * §11.2), so every failure here answers "not a co-op board": the dialog then
 * files exactly the solo submission it filed before any of this existed.
 */
export async function loadBoardPlayersAction(
    gameSlug: string,
    categorySlug: string,
    subcategoryValues: Record<string, string>,
    timing: 'rt' | 'gt',
): Promise<BoardPlayers> {
    try {
        const res = await getLeaderboard({
            gameSlug,
            categorySlug,
            timing,
            subcategoryValues,
            pageSize: 1,
        });
        if (!res.ok) return NOT_COOP;
        return {
            players: res.result.players ?? null,
            coopBoard: res.result.coopBoard === true,
            playersScope: res.result.playersScope ?? null,
        };
    } catch {
        return NOT_COOP;
    }
}
