import { cacheLife } from 'next/cache';
import { apiResponse } from '~app/(old-layout)/api/response';
import { getGamesPagesFromSearchParams } from '~src/components/game/get-tabulated-game-stats';

export async function GET(request: Request) {
    'use cache';
    cacheLife('hours');

    const { searchParams } = new URL(request.url);
    const result = await getGamesPagesFromSearchParams(searchParams);

    return apiResponse({
        body: result,
        cache: { maxAge: 60 * 60 * 24, swr: 60 * 60 * 24 },
    });
}
