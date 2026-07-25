import { cacheLife, cacheTag } from 'next/cache';
import type { GameStandings } from '../../types/leaderboards.types';
import { apiFetch } from './api-client';

export const standingsCacheTag = (gameId: number) => `standings:${gameId}`;

/**
 * Cross-category standings matrix for a game.
 *
 * Public endpoint, no session. Returns the raw runner x category grid with no
 * score in it — scoring depends on which categories the viewer has toggled on,
 * so it happens in the browser. See docs/frontend-guide-game-standings.md.
 *
 * Returns null when the game has no standings to show (unknown game, or every
 * featured board empty). Callers render an empty state rather than 404ing;
 * a game with no ranked runs is a normal state, not an error.
 */
export async function getGameStandings(
    gameId: number,
): Promise<GameStandings | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag(standingsCacheTag(gameId));

    try {
        const result = await apiFetch<GameStandings>(
            `/mod/v1/games/${gameId}/standings`,
        );
        if (!result || result.categories.length === 0) return null;
        return result;
    } catch {
        return null;
    }
}
