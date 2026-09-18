'use server';

import { cacheLife } from 'next/dist/server/use-cache/cache-life';
import { safeEncodeURI } from '~src/utils/uri';

/** The path of `url`, for error messages — never the query or the host. */
const pathOf = (url: string) => {
    try {
        return new URL(url).pathname;
    } catch {
        return url;
    }
};

const fetchData = async (url: string, cacheRevalidateSeconds = 0) => {
    const res = await fetch(url, {
        cache: cacheRevalidateSeconds === 0 ? 'no-cache' : 'force-cache',
        next: { revalidate: cacheRevalidateSeconds },
    });

    // An upstream 5xx used to reach the callers as `undefined` (or as a JSON
    // parse error), and the spread that followed turned it into an empty
    // object that then sat in the remote cache for days. Fail loudly instead:
    // a rejected cached function is never written to the cache.
    if (!res.ok) {
        throw new Error(
            `Game lookup failed: ${pathOf(url)} answered ${res.status}`,
        );
    }

    const json = await res.json();

    return json.result;
};

export const getGame = async (game: string) => {
    'use cache: remote';
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

    if (!gameData) {
        // Retry space-as-plus once; otherwise the game is unknown and we
        // throw, so the empty answer is not what gets cached.
        if (game.includes(' ')) {
            return getGame(game.replace(' ', '+'));
        }
        throw new Error(`Game lookup returned nothing for "${game}"`);
    }

    if (!gameData.data) {
        return gameData;
    }

    if (!globalGameData) {
        throw new Error(`Global game lookup returned nothing for "${game}"`);
    }

    return { ...gameData, global: { ...globalGameData } };
};

export const getGameGlobal = async (game: string) => {
    'use cache: remote';
    cacheLife('days');

    game = game.replace('   ', ' + ');
    game = safeEncodeURI(game);

    const globalGameData = await fetchData(
        `${process.env.NEXT_PUBLIC_DATA_URL}/games/global/${game}`,
        60 * 60 * 12,
    );

    if (!globalGameData) {
        if (game.includes(' ')) {
            return getGame(game.replace(' ', '+'));
        }
        // Spreading the missing answer gave callers `{}` — no display, no
        // image — and `cacheLife('days')` kept serving it long after the API
        // came back. Throwing keeps the miss out of the cache; callers degrade.
        throw new Error(`Global game lookup returned nothing for "${game}"`);
    }

    return { ...globalGameData };
};

export const getCategory = async (game: string, category: string) => {
    'use cache: remote';
    cacheLife('days');

    game = safeEncodeURI(game);
    category = safeEncodeURI(category);

    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/games/global/${game}/${category}`;

    return fetchData(url);
};
