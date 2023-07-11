import { NextRequest, NextResponse } from "next/server";
import { getCategory } from "~src/components/game/get-game";
import { safeEncodeURI } from "~src/utils/uri";
import { apiResponse } from "~app/api/response";

export const revalidate = 600;

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

    const gameData = await getCategory(
        safeEncodeURI(game),
        safeEncodeURI(category)
    );

    return apiResponse({
        body: gameData,
        cache: { maxAge: revalidate, swr: 15000 },
    });
}
