'use server';

import type { Game } from '~app/(old-layout)/games/games.types';
import { getGamesPage } from '~src/components/game/get-tabulated-game-stats';
import { apiFetch } from './api-client';
import type { CategoryStats } from './highlights';

export type { CategoryStats };

export interface GameSearchResult {
    game: string;
    display: string;
    image?: string;
}

export async function searchGames(query: string): Promise<GameSearchResult[]> {
    if (query.length < 2) return [];

    const result = await getGamesPage(query, 1, 8);

    return result.items.map((g: Game) => ({
        game: g.game,
        display: g.display,
        image: g.image,
    }));
}

export async function getCategoriesForGame(
    game: string,
): Promise<CategoryStats[]> {
    if (!game) return [];

    return apiFetch<CategoryStats[]>(
        `/v1/runs/categories?game=${encodeURIComponent(game)}&sort=-total_run_time&limit=100`,
    );
}
