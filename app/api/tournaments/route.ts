import { NextResponse } from "next/server";
import { getTournaments } from "~src/components/tournament/getTournaments";

export async function GET() {
    const result = await getTournaments();

    return NextResponse.json(result, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": `s-maxage=300, stale-while-revalidate=12000`,
        },
    });
}
