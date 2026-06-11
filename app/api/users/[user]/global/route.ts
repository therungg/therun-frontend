import { NextRequest } from 'next/server';
import { apiResponse } from '~app/api/response';
import { getGlobalUser } from '~src/lib/get-global-user';

export async function GET(
    _request: NextRequest,
    props: {
        params: Promise<{ user: string }>;
    },
) {
    const params = await props.params;
    const { user } = params;
    const userData = await getGlobalUser(user);

    return apiResponse({
        body: userData,
        // getGlobalUser is remote-cached for hours; a shorter CDN maxAge
        // just turns repeat requests into STALE revalidation invocations
        // without serving fresher data.
        cache: {
            maxAge: 3600,
            swr: 86400,
        },
    });
}
