import { cacheLife } from 'next/cache';
import { NextRequest } from 'next/server';
import { apiResponse } from '~app/api/response';
import { getGame } from '~src/components/game/get-game';

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
        gameData = await getGame(game);
    } catch (e) {
        console.error(e);
        // The caller (the compare tab) treats a null body as "no stats yet".
        // No cache header on this branch, so the miss isn't held at the edge.
        return apiResponse({ body: null, status: 502 });
    }

    return apiResponse({
        body: gameData,
        cache: { maxAge: 60, swr: 60 },
    });
}
