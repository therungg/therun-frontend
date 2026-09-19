import { cacheLife } from 'next/cache';
import type { Game } from '~app/(new-layout)/games/games.types';
import { getGamesPage } from '~src/components/game/get-tabulated-game-stats';

export interface GameResult {
    game: string;
    display: string;
    image?: string;
    categoryCount: number;
    uniqueRunners?: number;
    runs30d?: number;
}

const MAX_GAMES = 8;

// The topbar search draws games from the same source /games does, so a game a
// user can find on that page is findable from the search box too.
export const findGames = async (term: string): Promise<GameResult[]> => {
    'use cache';
    cacheLife('hours');

    if (term.length < 2) return [];

    const result = await getGamesPage(term, 1, MAX_GAMES);

    return (result?.items ?? []).map((game: Game) => ({
        game: game.game,
        display: game.display,
        image: game.image,
        categoryCount: game.categories?.length ?? 0,
        uniqueRunners: game.uniqueRunners,
        runs30d: game.runs30d,
    }));
};
