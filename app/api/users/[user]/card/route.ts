import { NextRequest } from 'next/server';
import { apiResponse } from '~app/api/response';
import { getUserCard } from '~src/lib/get-user-card';

/**
 * Backs the site-wide hover card. Long CDN cache with a day of
 * stale-while-revalidate: the second visitor to hover a given runner is served
 * from the edge and never reaches a function.
 */
export async function GET(
    _request: NextRequest,
    props: { params: Promise<{ user: string }> },
) {
    const { user } = await props.params;

    return apiResponse({
        body: await getUserCard(user),
        cache: { maxAge: 3600, swr: 86400 },
    });
}
