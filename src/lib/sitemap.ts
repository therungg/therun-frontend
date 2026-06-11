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

// The per-cursor pages are remote-cached (small entries, shared across
// instances); the aggregate functions keep plain 'use cache' because the
// full catalog is too large for a single remote cache entry. Every sitemap
// render used to re-paginate the whole backend catalog.
async function getSitemapUsersPage(
    cursor: number | null,
): Promise<SitemapResponse<SitemapUser>> {
    'use cache: remote';
    cacheLife('days');
    cacheTag('sitemap-users');

    const url = cursor
        ? `${BASE_URL}/sitemap/users?cursor=${cursor}`
        : `${BASE_URL}/sitemap/users`;
    const res = await fetch(url);
    return res.json();
}

export async function getSitemapUsers(): Promise<SitemapUser[]> {
    'use cache';
    cacheLife('days');
    cacheTag('sitemap-users');

    const allUsers: SitemapUser[] = [];
    let cursor: number | null = null;

    while (true) {
        const data = await getSitemapUsersPage(cursor);

        allUsers.push(...data.result);

        if (!data.cursor || data.result.length === 0) break;
        cursor = data.cursor;
    }

    return allUsers;
}

export async function getSitemapRuns(
    cursor?: number,
): Promise<SitemapResponse<SitemapRun>> {
    'use cache: remote';
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
