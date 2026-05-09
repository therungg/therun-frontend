'use server';

import { cacheLife, cacheTag } from 'next/cache';
import type {
    LeaderboardResponse,
    UserRanking,
    VariableDef,
    VariablesResponse,
    WrHistoryEntry,
} from '../../types/leaderboards.types';
import { v1Fetch } from './v1-fetch';

export interface LeaderboardQuery {
    gameSlug: string;
    categorySlug: string;
    timing: 'rt' | 'gt';
    subcategoryHash?: string;
    verified?: boolean;
    page?: number;
    pageSize?: number;
    /** filter-typed variables: { platform: 'N64', region: 'JP' } or { platform: 'N64,Wii' } */
    varFilters?: Record<string, string>;
}

function buildLeaderboardQS(q: LeaderboardQuery): string {
    const sp = new URLSearchParams();
    sp.set('timing', q.timing);
    if (q.subcategoryHash !== undefined)
        sp.set('subcategory', q.subcategoryHash);
    if (q.verified) sp.set('verified', 'true');
    if (q.page) sp.set('page', String(q.page));
    if (q.pageSize) sp.set('pageSize', String(q.pageSize));
    if (q.varFilters) {
        for (const [k, v] of Object.entries(q.varFilters)) {
            sp.set(`var_${k}`, v);
        }
    }
    return sp.toString();
}

export async function getLeaderboard(
    q: LeaderboardQuery,
): Promise<LeaderboardResponse> {
    'use cache';
    cacheLife('minutes');
    cacheTag(
        `lb:${q.gameSlug}:${q.categorySlug}:${q.subcategoryHash ?? ''}:${q.timing}:${q.verified ? 'v' : 'a'}`,
    );

    const game = encodeURIComponent(q.gameSlug);
    const category = encodeURIComponent(q.categorySlug);
    const path = `/v1/leaderboards/${game}/${category}?${buildLeaderboardQS(q)}`;
    const raw = await v1Fetch<{
        items: LeaderboardResponse['entries'];
        totalItems: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>(path);
    return {
        entries: raw.items ?? [],
        page: raw.page,
        pageSize: raw.pageSize,
        totalItems: raw.totalItems,
        totalPages: raw.totalPages,
    };
}

export async function getVariables(
    gameSlug: string,
    categorySlug: string,
): Promise<VariableDef[]> {
    'use cache';
    cacheLife('hours');
    cacheTag(`game-vars:${gameSlug}:${categorySlug}`);

    const path = `/v1/leaderboards/${encodeURIComponent(gameSlug)}/${encodeURIComponent(categorySlug)}/variables`;
    const body = await v1Fetch<VariablesResponse>(path);
    return body.variables ?? [];
}

export async function getWrHistory(
    gameSlug: string,
    categorySlug: string,
    subcategoryHash = '',
): Promise<WrHistoryEntry[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`wr-history:${gameSlug}:${categorySlug}:${subcategoryHash}`);

    const path = `/v1/leaderboards/wr-history/${encodeURIComponent(gameSlug)}/${encodeURIComponent(categorySlug)}?subcategory=${encodeURIComponent(subcategoryHash)}`;
    const body = await v1Fetch<{ result: WrHistoryEntry[] }>(path);
    return body.result ?? [];
}

export async function getUserRankings(userId: number): Promise<UserRanking[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`user-rankings:${userId}`);

    const path = `/v1/leaderboards/user/${userId}/rankings`;
    const body = await v1Fetch<{ result: UserRanking[] }>(path);
    return body.result ?? [];
}
