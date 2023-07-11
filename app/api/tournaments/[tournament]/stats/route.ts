import { getTournamentStatsByName } from "~src/components/tournament/getTournaments";
import { NextRequest } from "next/server";
import { apiResponse } from "~app/api/response";

export async function GET(
    _: NextRequest,
    { params }: { params: { tournament: string } }
) {
    const result = await getTournamentStatsByName(params.tournament);

    return apiResponse({
        body: result,
        cache: {
            maxAge: 30,
            swr: 1500,
        },
    });
}
