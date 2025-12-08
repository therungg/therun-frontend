import { NextRequest } from 'next/server';
import { apiResponse } from '~app/(old-layout)/api/response';
import { getTournamentByName } from '~src/components/tournament/getTournaments';

export async function GET(
    _: NextRequest,
    props: { params: Promise<{ tournament: string }> },
) {
    const params = await props.params;
    const result = await getTournamentByName(params.tournament);

    return apiResponse({
        body: result,
        cache: {
            maxAge: 60,
            swr: 1500,
        },
    });
}
