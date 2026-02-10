'use server';

import { cacheLife, cacheTag } from 'next/cache';

const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL as string;

interface SitemapUser {
    id: number;
    username: string;
}

interface SitemapRun {
    id: number;
    user: string;
    game: string;
    run: string;
}

interface SitemapResponse<T> {
    result: T[];
    cursor: number | null;
}

export async function getSitemapUsers(): Promise<SitemapUser[]> {
    'use cache';
    cacheLife('days');
    cacheTag('sitemap-users');

    const allUsers: SitemapUser[] = [];
    let cursor: number | null = null;

    while (true) {
        const url = cursor
            ? `${BASE_URL}/sitemap/users?cursor=${cursor}`
            : `${BASE_URL}/sitemap/users`;
        const res = await fetch(url);
        const data: SitemapResponse<SitemapUser> = await res.json();

        allUsers.push(...data.result);

        if (!data.cursor || data.result.length === 0) break;
        cursor = data.cursor;
    }

    return allUsers;
}

export async function getSitemapRuns(
    cursor?: number,
): Promise<SitemapResponse<SitemapRun>> {
    'use cache';
    cacheLife('days');
    cacheTag('sitemap-runs');

    const url = cursor
        ? `${BASE_URL}/sitemap/runs?cursor=${cursor}`
        : `${BASE_URL}/sitemap/runs`;
    const res = await fetch(url);
    return res.json();
}

export async function getAllSitemapRuns(): Promise<SitemapRun[]> {
    'use cache';
    cacheLife('days');
    cacheTag('sitemap-runs');

    const allRuns: SitemapRun[] = [];
    let cursor: number | undefined;

    while (true) {
        const data = await getSitemapRuns(cursor);
        allRuns.push(...data.result);

        if (!data.cursor || data.result.length === 0) break;
        cursor = data.cursor;
    }

    return allRuns;
}
