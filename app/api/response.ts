import { NextResponse } from 'next/server';

interface ApiResponse<Body = unknown> {
    body: Body;
    cache?: StaleWhileRevalidateCache;
    status?: number;
    headers?: { [key: string]: string };
}

interface StaleWhileRevalidateCache {
    maxAge: number;
    swr: number;
}

export const apiResponse = ({
    body,
    cache = {
        maxAge: 0,
        swr: 0,
    },
    status = 200,
    headers = {},
}: ApiResponse) => {
    // NextResponse.json(undefined) throws "Value is not JSON serializable" —
    // a missing upstream body must degrade to an explicit null, not a 500.
    return NextResponse.json(body ?? null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': `s-maxage=${cache?.maxAge}, stale-while-revalidate=${cache?.swr}`,
            ...headers,
        },
        status,
    });
};
