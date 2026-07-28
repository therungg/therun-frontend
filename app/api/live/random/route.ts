import { apiResponse } from '~app/api/response';
import { getRandomTopLiveRun } from '~src/lib/live-runs';

export async function GET() {
    const result = await getRandomTopLiveRun();

    // The pick is already shared by everyone inside the 15s revalidate window,
    // so caching the response for the same window changes nothing but cost.
    return apiResponse({ body: result, cache: { maxAge: 15, swr: 60 } });
}
