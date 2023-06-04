import { NextRequest, NextResponse } from "next/server";
import { getCategory } from "~src/components/game/get-game";
import { encodeURI } from "~src/utils/uri";

export async function GET(
    _request: NextRequest,
    {
        params,
    }: {
        params: { game: string; category: string };
    }
) {
    const { game, category } = params;

    if (category === "*") {
        return NextResponse.json({});
    }

    const gameData = await getCategory(encodeURI(game), encodeURI(category));

    return NextResponse.json(gameData, {
        status: 200,
        headers: {
            "Cache-Control": "s-maxage=60, stale-while-revalidate=1500",
        },
    });
}
