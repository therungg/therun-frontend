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
    const gameData = await getGameGlobal(game);

    return apiResponse({
        body: gameData,
        // getGameGlobal is remote-cached for days; match the CDN freshness.
        cache: { maxAge: 3600, swr: 86400 },
    });
}
