import { cacheLife } from 'next/cache';
import { NextRequest } from 'next/server';
import { apiResponse } from '~app/api/response';
import { editUser } from '~src/lib/edit-user';
import { getUserRuns } from '~src/lib/get-user-runs';

export async function GET(
    _: NextRequest,
    props: {
        params: Promise<{ user: string }>;
    },
) {
    const params = await props.params;
    const { user } = params;

    const result = await getUserRuns(user);

    // Consumed by third-party overlays, not by the site itself (profile pages
    // render through getUserRuns directly). At maxAge 60 the CDN entry expired
    // faster than pollers hit it, so ~30 revalidations/min per popular user
    // reached a function. PB data does not change minute to minute.
    return apiResponse({
        body: result,
        cache: {
            maxAge: 300,
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
