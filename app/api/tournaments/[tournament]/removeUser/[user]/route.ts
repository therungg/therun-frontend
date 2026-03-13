import { NextRequest } from 'next/server';
import { apiResponse } from '~app/(old-layout)/api/response';
import { banUserFromTournament } from '~src/components/tournament/getTournaments';

export async function GET(
    _: NextRequest,
    props: { params: Promise<{ tournament: string; user: string }> },
) {
    const params = await props.params;
    const result = await banUserFromTournament(params.tournament, params.user);

    return apiResponse({ body: result });
}
