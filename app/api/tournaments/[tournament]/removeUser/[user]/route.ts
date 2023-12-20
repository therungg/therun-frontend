import { NextRequest } from "next/server";
import { banUserFromTournament } from "~src/components/tournament/getTournaments";
import { apiResponse } from "~app/api/response";

export async function GET(
    _: NextRequest,
    { params }: { params: { tournament: string; user: string } },
) {
    const result = await banUserFromTournament(params.tournament, params.user);

    return apiResponse({ body: result });
}
