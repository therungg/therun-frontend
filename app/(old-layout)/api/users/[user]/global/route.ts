import { NextRequest } from 'next/server';
import { apiResponse } from '~app/(old-layout)/api/response';
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
        cache: {
            maxAge: 60,
            swr: 15000,
        },
    });
}
