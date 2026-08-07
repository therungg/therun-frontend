import { cacheLife } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { apiResponse } from '~app/api/response';
import { getCategory } from '~src/components/game/get-game';
import { safeEncodeURI } from '~src/utils/uri';

export async function GET(
    _request: NextRequest,
    props: {
        params: Promise<{ game: string; category: string }>;
    },
) {
    const params = await props.params;
    const { game, category } = params;

    if (category === '*') {
        return NextResponse.json({});
    }

    const gameData = await getCategory(
        safeEncodeURI(game),
        safeEncodeURI(category),
    );

    // The backend gateway has no /games/global/{game}/{category} route, so
    // this arrives as undefined once the remote cache expires — and
    // NextResponse.json(undefined) throws, turning a missing upstream into a
    // 500. Serve an explicit 404 instead, with a short cache so it stops
    // hammering the (broken) upstream per request.
    if (gameData == null) {
        return apiResponse({
            body: null,
            status: 404,
            cache: { maxAge: 300, swr: 3600 },
        });
    }

    return apiResponse({
        body: gameData,
        // getCategory is remote-cached for days; match the CDN freshness.
        cache: { maxAge: 3600, swr: 86400 },
    });
}
