import { cacheLife, cacheTag } from 'next/cache';
import type { GameStandings } from '../../types/leaderboards.types';
import { apiFetch } from './api-client';

export const standingsCacheTag = (gameId: number) => `standings:${gameId}`;

export type StandingsResult =
    | { status: 'ok'; standings: GameStandings }
    /** Endpoint answered, the game genuinely has no ranked runs to show. */
    | { status: 'empty' }
    /** Endpoint failed or answered with something that isn't a standings grid. */
    | { status: 'unavailable'; reason: string };

/** A standings body has to carry the grid; anything else is not this endpoint. */
function isGameStandings(value: unknown): value is GameStandings {
    if (!value || typeof value !== 'object') return false;
    const v = value as Partial<GameStandings>;
    return (
        Array.isArray(v.categories) &&
        Array.isArray(v.runners) &&
        Array.isArray(v.cells)
    );
}

/**
 * Cross-category standings matrix for a game.
 *
 * Public endpoint, no session. Returns the raw runner x category grid with no
 * score in it — scoring depends on which categories the viewer has toggled on,
 * so it happens in the browser. See docs/frontend-guide-game-standings.md.
 *
 * Distinguishes "nothing to show" from "couldn't get it". This used to collapse
 * both into null, and when a deploy dropped the backend route the endpoint
 * started answering 200 with unrelated pageData — the shape check failed, the
 * bare catch swallowed it, and a total outage rendered for days as a calm
 * "no ranked runs yet". An endpoint that misbehaves must not look like an
 * empty game.
 */
export async function getGameStandings(
    gameId: number,
): Promise<StandingsResult> {
    'use cache';
    cacheLife('minutes');
    cacheTag(standingsCacheTag(gameId));

    let result: unknown;
    try {
        result = await apiFetch<unknown>(`/mod/v1/games/${gameId}/standings`);
    } catch (e) {
        return {
            status: 'unavailable',
            reason: e instanceof Error ? e.message : 'Request failed',
        };
    }

    // An unknown game answers with no body at all — that is a real empty, not
    // a malfunction.
    if (result == null) return { status: 'empty' };

    if (!isGameStandings(result)) {
        return {
            status: 'unavailable',
            reason: 'Standings endpoint returned an unexpected shape',
        };
    }

    if (result.categories.length === 0) return { status: 'empty' };
    return { status: 'ok', standings: result };
}
