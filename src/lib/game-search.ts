'use server';

import { cacheLife } from 'next/cache';
import type { Game } from '~app/(new-layout)/games/games.types';
import { getGamesPage } from '~src/components/game/get-tabulated-game-stats';
import { ApiError, apiFetch } from './api-client';
import {
    type CategoryStats,
    type CategoryStatsRow,
    mapCategoryStatsRow,
} from './category-stats-row';

export type { CategoryStats };

export interface GameSearchResult {
    id: number;
    game: string;
    display: string;
    image?: string;
}

/**
 * The games search is Algolia, and its records carry no game id — `id` comes
 * back undefined whatever `Game` says. Every caller acts on the id (merging a
 * game, listing its moderators), so each hit is resolved to its real one by
 * name. A hit that no longer resolves is dropped.
 */
export async function searchGames(query: string): Promise<GameSearchResult[]> {
    if (query.length < 2) return [];

    const result = await getGamesPage(query, 1, 8);

    const resolved = await Promise.all(
        result.items.map(async (g: Game): Promise<GameSearchResult | null> => {
            const id = await gameIdByName(g.game);
            if (id === null) return null;
            return {
                id,
                game: g.game,
                display: g.display,
                image: g.image,
            };
        }),
    );
    return resolved.filter((g): g is GameSearchResult => g !== null);
}

async function gameIdByName(name: string): Promise<number | null> {
    'use cache';
    cacheLife('hours');
    try {
        const game = await apiFetch<{ id: number }>(
            `/v1/games/by-slug/${encodeURIComponent(name)}`,
        );
        return game.id;
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
    }
}

export async function getCategoriesForGame(
    game: string,
): Promise<CategoryStats[]> {
    if (!game) return [];

    const rows = await apiFetch<CategoryStatsRow[]>(
        `/v1/runs/categories?game=${encodeURIComponent(game)}&sort=-total_run_time&limit=100`,
    );
    return rows.map(mapCategoryStatsRow);
}
