import { NextRequest } from "next/server";
import { getGame } from "~src/components/game/get-game";
import { apiResponse } from "~app/api/response";

export async function GET(
    _request: NextRequest,
    {
        params,
    }: {
        params: { game: string };
    }
) {
    const { game } = params;
    const gameData = await getGame(game);

    return apiResponse({ body: gameData, cache: { maxAge: 60, swr: 15000 } });
}
