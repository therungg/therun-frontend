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
        // Same degradation as the unlimited branch below: an unreadable live
        // store must answer "nobody live", never `null`.
        const top = await getTopNLiveRuns(parseInt(limit));
        return apiResponse({ body: top ?? [], cache });
    }

    const result = await getAllLiveRuns(
        searchParams.get('game'),
        searchParams.get('category'),
    );

    // The live store answers an error body, not a list, when it is
    // throttled; `.result` is then undefined and would serialise as null.
    // Readers hold a list, so give them one.
    return apiResponse({ body: result ?? [], cache });
}
