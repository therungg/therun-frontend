'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import {
    addGameFromIgdb,
    requestGame,
    searchGamesToAdd,
} from '~src/lib/add-game';
import { ApiError } from '~src/lib/api-client';
import type {
    AddGameResult,
    AddGameSearchResult,
} from '../../types/add-game.types';

export type ActionError = { error: string; needsLogin?: true };

const LOGIN: ActionError = {
    error: 'Log in to add a game.',
    needsLogin: true,
};

const fail = (e: unknown, fallback: string): ActionError => {
    // An expired session reads as a 401 from the backend, not a client-side
    // signed-out check — send the caller to the same login view either way.
    if (e instanceof ApiError && e.status === 401) return LOGIN;
    return e instanceof ApiError && e.message
        ? { error: e.message }
        : { error: fallback };
};

export async function searchGamesToAddAction(
    query: string,
): Promise<{ result: AddGameSearchResult[] } | ActionError> {
    const user = await getSession();
    if (!user?.id) return LOGIN;
    const q = query.trim();
    if (q.length < 2) return { result: [] };
    try {
        return { result: await searchGamesToAdd(user.id, q) };
    } catch (e) {
        return fail(e, 'The search failed. Try again.');
    }
}

export async function addGameAction(
    igdbId: number,
): Promise<{ result: AddGameResult } | ActionError> {
    const user = await getSession();
    if (!user?.id) return LOGIN;
    try {
        const result = await addGameFromIgdb(user.id, igdbId);
        if (result.created) {
            // resolveGame caches a miss for hours under this tag: anyone who
            // opened /games/<name> before the game existed left a null behind.
            // updateTag, not revalidateTag — the redirect that follows must
            // read the new game, not the stale miss.
            updateTag(`game-resolve:${result.game.name}`);
        }
        return { result };
    } catch (e) {
        return fail(e, 'The game could not be added. Try again.');
    }
}

export async function requestGameAction(input: {
    name: string;
    note: string;
}): Promise<{ result: { requested: true } } | ActionError> {
    const user = await getSession();
    if (!user?.id) return LOGIN;
    try {
        return {
            result: await requestGame(
                user.id,
                input.name.trim(),
                input.note.trim(),
            ),
        };
    } catch (e) {
        return fail(e, 'The request could not be sent. Try again.');
    }
}
