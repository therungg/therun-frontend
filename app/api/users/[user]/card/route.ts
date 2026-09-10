import { NextRequest } from 'next/server';
import { apiResponse } from '~app/api/response';
import { getUserCard } from '~src/lib/get-user-card';

/**
 * Backs the site-wide hover card. Long CDN cache with a day of
 * stale-while-revalidate: the second visitor to hover a given runner is served
 * from the edge and never reaches a function. `?game=` is part of the URL, so
 * the edge keys each user/game pair separately.
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ user: string }> },
) {
    const { user } = await props.params;
    const game = request.nextUrl.searchParams.get('game');

    return apiResponse({
        body: await getUserCard(user, game || null),
        cache: { maxAge: 3600, swr: 86400 },
    });
}
