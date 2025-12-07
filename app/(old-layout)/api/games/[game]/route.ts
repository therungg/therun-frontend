import { cacheLife } from 'next/cache';
import { NextRequest } from 'next/server';
import { apiResponse } from '~app/(old-layout)/api/response';
import { getGame } from '~src/components/game/get-game';

export async function GET(
    _request: NextRequest,
    props: {
        params: Promise<{ game: string }>;
    },
) {
    'use cache';
    cacheLife('hours');

    const params = await props.params;
    const { game } = params;
    const gameData = await getGame(game);

    return apiResponse({
        body: gameData,
        cache: { maxAge: 60, swr: 60 },
    });
}
