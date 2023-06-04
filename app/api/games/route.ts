import { NextResponse } from "next/server";
import { getTabulatedGameStats } from "~src/components/game/get-tabulated-game-stats";

export async function GET() {
    const result = await getTabulatedGameStats();
    return NextResponse.json(result, {
        status: 200,
        headers: {
            "Cache-Control": "s-maxage=10, stale-while-revalidate=1500",
        },
    });
}
