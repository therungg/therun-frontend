import { getGamesPagesFromSearchParams } from "~src/components/game/get-tabulated-game-stats";
import { apiResponse } from "~app/api/response";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const result = await getGamesPagesFromSearchParams(searchParams);

    return apiResponse({
        body: result,
        cache: { maxAge: 60 * 60 * 6, swr: 60 * 60 * 24 },
    });
}
