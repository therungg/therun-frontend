import { NextResponse } from "next/server";
import { getGamesPagesFromSearchParams } from "~src/components/game/get-tabulated-game-stats";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const result = await getGamesPagesFromSearchParams(searchParams);

    return NextResponse.json(result, {
        status: 200,
        headers: {
            "Cache-Control": "s-maxage=10, stale-while-revalidate=1500",
        },
    });
}
