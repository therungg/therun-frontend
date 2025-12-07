import { apiResponse } from '~app/(old-layout)/api/response';
import { getRandomTopLiveRun } from '~src/lib/live-runs';

export async function GET() {
    const result = await getRandomTopLiveRun();

    return apiResponse({ body: result });
}
