import { NextRequest } from "next/server";
import { getGame } from "~src/components/game/get-game";
import { apiResponse } from "~app/api/response";

export const revalidate = 60;

export async function GET(
    _request: NextRequest,
    props: {
        params: Promise<{ game: string }>;
    },
) {
    const params = await props.params;
    const { game } = params;
    const gameData = await getGame(game);

    return apiResponse({
        body: gameData,
        cache: { maxAge: revalidate, swr: 60 },
    });
}
