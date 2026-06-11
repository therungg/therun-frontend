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

    return apiResponse({
        body: gameData,
        // getCategory is remote-cached for days; match the CDN freshness.
        cache: { maxAge: 3600, swr: 86400 },
    });
}
