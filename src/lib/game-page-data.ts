import { cacheLife, cacheTag } from 'next/cache';
import { cache } from 'react';
import { apiFetch } from './api-client';

/**
 * `/v1/games/{id}` — the game's whole page payload (game row, categories,
 * groups). Several unrelated loaders read different slices of it, and the
 * manage console used to fetch it more than once in a single render.
 *
 * Memoised per request rather than cached across requests: the console
 * refreshes the route after every write and has to see its own edit, so
 * nothing here may outlive the render that asked for it.
 *
 * Callers keep their own view of the payload — each one declares the slice it
 * reads — so this returns the raw body for them to narrow.
 */
export const loadGamePageData = cache(
    async (gameId: number): Promise<unknown> =>
        apiFetch<unknown>(`/v1/games/${gameId}`),
);

/**
 * The same payload, cached across requests, for the public pages — the game
 * page, standings, stats, races, run and manual pages all read a slice of it
 * and every one of them used to pay its own round trip per visitor.
 *
 * Carries no session and never reads cookies or headers, which is what lets
 * it sit under `'use cache'` at all; the console's read stays on the memo
 * above because it has to see its own edit.
 *
 * Tagged three ways on purpose. `game-page:{id}` names the payload itself,
 * and `game-meta:{id}` / `game-cats:{id}` are the tags the console already
 * expires after a write that changes it (see the setup and manage actions),
 * so every existing invalidation drops this entry too and public pages pick
 * a mod's change up without a new call site having to remember to.
 */
export async function loadCachedGamePageData(gameId: number): Promise<unknown> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`game-page:${gameId}`);
    cacheTag(`game-meta:${gameId}`);
    cacheTag(`game-cats:${gameId}`);

    return apiFetch<unknown>(`/v1/games/${gameId}`);
}
