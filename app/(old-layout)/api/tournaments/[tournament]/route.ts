import { NextRequest } from "next/server";
import { getTournamentByName } from "~src/components/tournament/getTournaments";
import { apiResponse } from "~app/(old-layout)/api/response";

export const revalidate = 30;

export async function GET(
    _: NextRequest,
    props: { params: Promise<{ tournament: string }> },
) {
    const params = await props.params;
    const result = await getTournamentByName(params.tournament);

    return apiResponse({
        body: result,
        cache: {
            maxAge: revalidate,
            swr: 1500,
        },
    });
}
