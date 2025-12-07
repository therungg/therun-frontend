import { NextRequest } from 'next/server';
import { apiResponse } from '~app/(old-layout)/api/response';
import { getAllLiveRuns, getTopNLiveRuns } from '~src/lib/live-runs';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');

    if (limit) {
        return apiResponse({ body: await getTopNLiveRuns(parseInt(limit)) });
    }

    const result = await getAllLiveRuns(
        searchParams.get('game'),
        searchParams.get('category'),
    );

    return apiResponse({ body: result });
}
