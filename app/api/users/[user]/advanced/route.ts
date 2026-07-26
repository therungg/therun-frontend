import { NextRequest } from 'next/server';
import { apiResponse } from '~app/api/response';
import { getAdvancedUserStats } from '~src/lib/get-advanced-user-stats';

export const maxDuration = 60;

export async function GET(
    _request: NextRequest,
    props: {
        params: Promise<{ user: string }>;
    },
) {
    const params = await props.params;
    const { user } = params;
    const userData = await getAdvancedUserStats(user, '0');

    // getAdvancedUserStats is remote-cached for hours and is the most
    // expensive route we serve (maxDuration 60) — cache the response to match.
    return apiResponse({
        body: userData,
        cache: {
            maxAge: 3600,
            swr: 86400,
        },
    });
}
