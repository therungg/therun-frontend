import { NextRequest } from 'next/server';
import { apiResponse } from '~app/api/response';
import { getAllLiveRuns, getTopNLiveRuns } from '~src/lib/live-runs';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');

    // Both getters are already only 5s-fresh (cacheLife stale: 5); without a
    // CDN maxAge every overlay poll became its own function invocation.
    const cache = { maxAge: 5, swr: 30 };

    if (limit) {
        return apiResponse({
            body: await getTopNLiveRuns(parseInt(limit)),
            cache,
        });
    }

    const result = await getAllLiveRuns(
        searchParams.get('game'),
        searchParams.get('category'),
    );

    return apiResponse({ body: result, cache });
}
