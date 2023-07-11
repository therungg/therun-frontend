import { NextRequest } from "next/server";
import { getAllLiveRuns } from "~src/lib/live-runs";
import { apiResponse } from "~app/api/response";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const result = await getAllLiveRuns(
        searchParams.get("game"),
        searchParams.get("category")
    );

    return apiResponse({ body: result });
}
