'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    type IgdbSearchResult,
    igdbSearchGames,
    igdbSyncGame,
} from '~src/lib/game-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

const NOT_ALLOWED = 'Only this game\u2019s admins can re-match it.';

// Both gated on edit-game scoped to this game, which mirrors the backend's
// `checkGameMgmtPermission(pgId, "edit-game", { gameId })` on igdb-search and
// igdb-sync: site admins anywhere, game admins on their own board. This side
// used to demand a site admin outright, which the backend never did.

export async function igdbSearchAction(input: {
    gameId: number;
    gameName: string;
    query: string;
}): Promise<{ result: IgdbSearchResult[] } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'game', { game: input.gameName });
    } catch {
        return { error: NOT_ALLOWED };
    }
    if (!input.query.trim()) return { result: [] };
    try {
        const result = await igdbSearchGames(
            user.id,
            input.gameId,
            input.query.trim(),
        );
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'IGDB search failed.' };
    }
}

export async function igdbApplyMatchAction(input: {
    gameId: number;
    gameName: string;
    igdbId: number;
}): Promise<{ result: { igdbName: string } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'game', { game: input.gameName });
    } catch {
        return { error: NOT_ALLOWED };
    }
    try {
        const result = await igdbSyncGame(user.id, input.gameId, input.igdbId);
        revalidateTag(`game-meta:${input.gameId}`, 'minutes');
        return { result: { igdbName: result.igdbName } };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to apply the IGDB match.' };
    }
}
