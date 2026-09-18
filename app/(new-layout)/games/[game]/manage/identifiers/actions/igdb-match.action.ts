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

// Both gated on global edit-game (site admins) — matches the backend's
// checkGameMgmtPermission gate on igdb-search/igdb-sync.

export async function igdbSearchAction(input: {
    gameId: number;
    query: string;
}): Promise<{ result: IgdbSearchResult[] } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'game');
    } catch {
        return { error: 'Only site admins can re-match a game.' };
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
    igdbId: number;
}): Promise<{ result: { igdbName: string } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'game');
    } catch {
        return { error: 'Only site admins can re-match a game.' };
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
