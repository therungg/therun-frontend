import { cacheLife } from 'next/cache';
import { NextRequest } from 'next/server';
import { apiResponse } from '~app/(old-layout)/api/response';
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
        cache: { maxAge: 60, swr: 43200 },
    });
}
