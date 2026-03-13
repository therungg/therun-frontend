import { apiResponse } from '~app/api/response';
import { getRandomTopLiveRun } from '~src/lib/live-runs';

export async function GET() {
    const result = await getRandomTopLiveRun();

    return apiResponse({ body: result });
}
