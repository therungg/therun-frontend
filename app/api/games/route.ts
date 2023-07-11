import { getGamesPagesFromSearchParams } from "~src/components/game/get-tabulated-game-stats";
import { apiResponse } from "~app/api/response";

// Long cache because this endpoint is very expensive and doesnt get updated often anyway.
export const revalidate = 60 * 60 * 6;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const result = await getGamesPagesFromSearchParams(searchParams);

    return apiResponse({
        body: result,
        cache: { maxAge: revalidate, swr: 60 * 60 * 24 },
    });
}
