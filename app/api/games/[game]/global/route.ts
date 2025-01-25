import { NextRequest } from "next/server";
import { getGameGlobal } from "~src/components/game/get-game";
import { apiResponse } from "~app/api/response";

export const revalidate = 43200;

export async function GET(
    _request: NextRequest,
    props: {
        params: Promise<{ game: string }>;
    },
) {
    const params = await props.params;
    const { game } = params;
    const gameData = await getGameGlobal(game);

    return apiResponse({
        body: gameData,
        cache: { maxAge: revalidate, swr: 43200 },
    });
}
