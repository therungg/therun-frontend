'use server';

import { cacheLife, cacheTag } from 'next/cache';
import type { GameModerator } from '../../types/board-claims.types';
import { ApiError, apiFetch } from './api-client';

export async function listGameModerators(
    gameId: number,
): Promise<GameModerator[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`game-mods:${gameId}`);

    try {
        const result = await apiFetch<GameModerator[]>(
            `/mod/v1/games/${gameId}/moderators`,
        );
        return result ?? [];
    } catch (e) {
        // Endpoint is part of the backend handoff; 404 = not deployed yet.
        if (e instanceof ApiError && e.status === 404) return [];
        throw e;
    }
}
