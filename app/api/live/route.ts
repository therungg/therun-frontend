import { NextRequest } from "next/server";
import { getAllLiveRuns, getTopNLiveRuns } from "~src/lib/client/live-runs";
import { apiResponse } from "~app/api/response";

export const revalidate = 0;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");

    if (limit) {
        return apiResponse({ body: await getTopNLiveRuns(parseInt(limit)) });
    }

    const result = await getAllLiveRuns(
        searchParams.get("game"),
        searchParams.get("category"),
    );

    return apiResponse({ body: result });
}
