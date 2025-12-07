import { cacheLife } from 'next/cache';
import { NextRequest } from 'next/server';
import { apiResponse } from '~app/(old-layout)/api/response';
import { editUser } from '~src/lib/edit-user';
import { getUserRuns } from '~src/lib/get-user-runs';

export async function GET(
    _: NextRequest,
    props: {
        params: Promise<{ user: string }>;
    },
) {
    'use cache';
    cacheLife('minutes');

    const params = await props.params;
    const { user } = params;

    const result = await getUserRuns(user);

    return apiResponse({
        body: result,
        cache: {
            maxAge: 60,
            swr: 1500,
        },
    });
}

export async function PUT(
    request: NextRequest,
    props: {
        params: Promise<{ user: string }>;
    },
) {
    const params = await props.params;
    const { user } = params;
    const data = await request.text();
    const result = await editUser(user, data);

    return apiResponse({
        body: result,
        headers: { 'Cache-Control': 'no-cache' },
    });
}
