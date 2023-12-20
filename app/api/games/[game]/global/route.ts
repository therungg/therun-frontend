import { NextRequest } from "next/server";
import { getGameGlobal } from "~src/components/game/get-game";
import { apiResponse } from "~app/api/response";

export const revalidate = 240;

export async function GET(
    _request: NextRequest,
    {
        params,
    }: {
        params: { game: string };
    },
) {
    const { game } = params;
    const gameData = await getGameGlobal(game);

    return apiResponse({
        body: gameData,
        cache: { maxAge: revalidate, swr: 15000 },
    });
}
