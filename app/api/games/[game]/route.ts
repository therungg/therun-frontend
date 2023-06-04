import { NextRequest, NextResponse } from "next/server";
import { getGame } from "~src/components/game/get-game";

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

    return NextResponse.json(gameData, {
        status: 200,
        headers: {
            "Cache-Control": "s-maxage=240, stale-while-revalidate=1500",
        },
    });
}
