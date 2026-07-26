import { NextRequest } from 'next/server';
import { apiResponse } from '~app/api/response';
import { getLiveRunForUser } from '~src/lib/live-runs';

export async function GET(
    _request: NextRequest,
    props: { params: Promise<{ username: string }> },
) {
    const params = await props.params;
    const result = await getLiveRunForUser(params.username);

    // Overlays poll this ~1/s per runner. getLiveRunForUser is only 5s-fresh
    // anyway, so a matching CDN maxAge costs no freshness.
    return apiResponse({ body: result, cache: { maxAge: 5, swr: 30 } });
}
