'use server';

import { cacheLife } from 'next/dist/server/use-cache/cache-life';
import { safeEncodeURI } from '~src/utils/uri';

const fetchData = async (url: string, cacheRevalidateSeconds = 0) => {
    const res = await fetch(url, {
        cache: cacheRevalidateSeconds === 0 ? 'no-cache' : 'force-cache',
        next: { revalidate: cacheRevalidateSeconds },
    });
    const json = await res.json();

    return json.result;
};

export const getGame = async (game: string) => {
    'use cache';
    cacheLife('hours');

    game = game.replace('   ', ' + ').toLowerCase().replace(/\s/g, '');
    game = safeEncodeURI(game);

    const promises = [
        fetchData(`${process.env.NEXT_PUBLIC_DATA_URL}/games/${game}`, 60 * 60),
        fetchData(
            `${process.env.NEXT_PUBLIC_DATA_URL}/games/global/${game}`,
            60 * 60 * 12,
        ),
    ];

    const [gameData, globalGameData] = await Promise.all(promises);

    if (!gameData && game.includes(' ')) {
        return getGame(game.replace(' ', '+'));
    }

    if (!gameData.data) {
        return gameData;
    }

    return { ...gameData, global: { ...globalGameData } };
};

export const getGameGlobal = async (game: string) => {
    'use cache';
    cacheLife('days');

    game = game.replace('   ', ' + ');
    game = safeEncodeURI(game);

    const globalGameData = await fetchData(
        `${process.env.NEXT_PUBLIC_DATA_URL}/games/global/${game}`,
        60 * 60 * 12,
    );

    if (!globalGameData && game.includes(' ')) {
        return getGame(game.replace(' ', '+'));
    }

    return { ...globalGameData };
};

export const getCategory = async (game: string, category: string) => {
    'use cache';
    cacheLife('days');

    game = safeEncodeURI(game);
    category = safeEncodeURI(category);

    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/games/global/${game}/${category}`;

    return fetchData(url);
};
