import { cacheLife } from 'next/cache';
import { NextRequest } from 'next/server';
import { apiResponse } from '~app/(old-layout)/api/response';
import { getTournamentStatsByName } from '~src/components/tournament/getTournaments';

export async function GET(
    _: NextRequest,
    props: { params: Promise<{ tournament: string }> },
) {
    const params = await props.params;
    const result = await getTournamentStatsByName(params.tournament);

    return apiResponse({
        body: result,
        cache: {
            maxAge: 30,
            swr: 1500,
        },
    });
}
