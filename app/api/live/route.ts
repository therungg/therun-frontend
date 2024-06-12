import { NextRequest } from "next/server";
import { getAllLiveRuns } from "~src/lib/live-runs";
import { apiResponse } from "~app/api/response";

export const revalidate = 0;

export async function GET(
    _request: NextRequest,
    {
        params,
    }: {
        params: { game: string; category: string };
    },
) {
    const game = params?.game;
    const category = params?.category;

    const result = await getAllLiveRuns(game, category);

    return apiResponse({ body: result });
}
