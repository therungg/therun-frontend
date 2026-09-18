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

    // A 404 is the backend's answer for a game it has no record of — the
    // handler responds `notFound({error: "No results"})`. That is a fact, not
    // a failure: it caches like any other answer, so we don't re-ask on every
    // request.
    if (res.status === 404) return undefined;

    // Anything else that isn't ok is an outage. It used to reach the callers
    // as `undefined` (or as a JSON parse error), and the spread that followed
    // turned it into an empty object that then sat in the remote cache for
    // days. Fail loudly instead: a rejected cached function is never written
    // to the cache.
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
        // Retry space-as-plus once; otherwise the game is unknown/empty —
        // return the falsy value rather than reading `.data` off undefined.
        // Callers guard with optional chaining (`data?.data?.game`).
        if (game.includes(' ')) {
            return getGame(game.replace(' ', '+'));
        }
        return gameData;
    }

    if (!gameData.data) {
        return gameData;
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

    if (!globalGameData && game.includes(' ')) {
        return getGame(game.replace(' ', '+'));
    }

    // A game the backend has no record of still spreads to `{}`, and that is
    // fine to keep for days. What must never land here is an outage: those
    // now reject out of fetchData, and a rejected cached function is not
    // written to the cache at all.
    return { ...globalGameData };
};

export const getCategory = async (game: string, category: string) => {
    'use cache: remote';
    cacheLife('days');

    game = safeEncodeURI(game);
    category = safeEncodeURI(category);

    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/games/global/${game}/${category}`;

    // This one route isn't registered on the gateway, so it answers 403 for
    // every category, forever — verified against api.therun.gg. Letting that
    // reject would leave nothing cached and put a request on the gateway for
    // every page view, which is what the route handler's short-cached 404 was
    // written to avoid. Swallow it here and keep the empty answer.
    return fetchData(url).catch(() => undefined);
};
