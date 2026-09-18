import { cacheLife } from 'next/cache';
import { NextRequest } from 'next/server';
import { apiResponse } from '~app/api/response';
import { getGameGlobal } from '~src/components/game/get-game';

export async function GET(
    _request: NextRequest,
    props: {
        params: Promise<{ game: string }>;
    },
) {
    const params = await props.params;
    const { game } = params;
    let gameData;
    try {
        gameData = await getGameGlobal(game);
    } catch (e) {
        console.error(e);
        // A failed lookup answers null and is not cached at the edge either —
        // a day-long CDN entry would outlive the outage just like the remote
        // cache entry used to.
        return apiResponse({ body: null, status: 502 });
    }

    return apiResponse({
        body: gameData,
        // getGameGlobal is remote-cached for days; match the CDN freshness.
        cache: { maxAge: 3600, swr: 86400 },
    });
}
