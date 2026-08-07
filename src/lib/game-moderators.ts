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
        // 404 = endpoint not deployed yet. 403 = API Gateway "Missing
        // Authentication Token": the /mod base-path mapping only exists on
        // api.therun.gg, so an environment pointed at the raw invoke URL
        // 403s every /mod route — that must degrade to "no moderators
        // shown", never crash the page (it took down all of games-v2 in
        // prod, 2026-08-07).
        if (e instanceof ApiError && (e.status === 404 || e.status === 403))
            return [];
        throw e;
    }
}
