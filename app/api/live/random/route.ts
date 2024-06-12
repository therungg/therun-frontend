import { getRandomTopLiveRun } from "~src/lib/live-runs";
import { apiResponse } from "~app/api/response";

export const revalidate = 0;

export async function GET() {
    const result = await getRandomTopLiveRun();

    return apiResponse({ body: result });
}
