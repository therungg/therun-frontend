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
    return NextResponse.json(body, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': `s-maxage=${cache?.maxAge}, stale-while-revalidate=${cache?.swr}`,
            ...headers,
        },
        status,
    });
};
