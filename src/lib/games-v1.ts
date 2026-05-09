'use server';

import { cacheLife, cacheTag } from 'next/cache';
import type {
    QuickStats,
    RecentPb,
    ResolvedCategory,
    ResolvedGame,
} from '../../types/leaderboards.types';
import { v1Fetch } from './v1-fetch';

interface GamesEndpointRow {
    gameId: number;
    gameDisplay: string;
    gameImage?: string | null;
    totalRunTime: number;
    totalAttemptCount: number;
    totalFinishedAttemptCount: number;
    uniqueRunners: number;
}

interface CategoriesEndpointRow {
    gameId: number;
    categoryId: number;
    gameDisplay: string;
    categoryDisplay: string;
    gameImage?: string | null;
    totalRunTime: number;
    totalAttemptCount: number;
    totalFinishedAttemptCount: number;
    uniqueRunners: number;
    primaryTiming?: 'rt' | 'gt';
    defaultSubcategoryHash?: string | null;
    sortAscending?: boolean;
    defaultVerified?: boolean;
}

function normalizeSlug(slug: string): string {
    return slug.toLowerCase().replace(/[\s-]+/g, '');
}

export async function resolveGame(slug: string): Promise<ResolvedGame | null> {
    'use cache';
    cacheLife('hours');
    const normalized = normalizeSlug(slug);
    cacheTag(`game-resolve:${normalized}`);

    const path = `/v1/runs/games?game_slug=${encodeURIComponent(normalized)}&limit=1`;
    const body = await v1Fetch<{ result: GamesEndpointRow[] }>(path);
    const row = body.result?.[0];
    if (!row) return null;

    return {
        id: row.gameId,
        name: row.gameDisplay.toLowerCase().replace(/\s+/g, ''),
        display: row.gameDisplay,
        image: row.gameImage ?? null,
    };
}

export async function getQuickStats(gameId: number): Promise<QuickStats> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`game-stats:${gameId}`);

    const path = `/v1/runs/games?game_id=${gameId}&limit=1`;
    const body = await v1Fetch<{ result: GamesEndpointRow[] }>(path);
    const row = body.result?.[0];
    if (!row) {
        return {
            totalRunTime: 0,
            totalAttemptCount: 0,
            totalFinishedAttemptCount: 0,
            uniqueRunners: 0,
        };
    }
    return {
        totalRunTime: row.totalRunTime,
        totalAttemptCount: row.totalAttemptCount,
        totalFinishedAttemptCount: row.totalFinishedAttemptCount,
        uniqueRunners: row.uniqueRunners,
    };
}

export async function resolveCategory(
    gameId: number,
    categorySlug?: string,
): Promise<{
    categories: ResolvedCategory[];
    selected: ResolvedCategory | null;
}> {
    'use cache';
    cacheLife('minutes');
    // Cache is keyed by gameId only; categorySlug is used post-fetch to pick
    // one entry from the cached list, so it intentionally shares cache across
    // category selections for the same game.
    cacheTag(`game-cats:${gameId}`);

    const path = `/v1/runs/categories?game_id=${gameId}&sort=-total_run_time&limit=200`;
    const body = await v1Fetch<{ result: CategoriesEndpointRow[] }>(path);
    const rows = body.result ?? [];
    const categories: ResolvedCategory[] = rows.map((r) => ({
        id: r.categoryId,
        name: r.categoryDisplay.toLowerCase().replace(/\s+/g, ''),
        display: r.categoryDisplay,
        primaryTiming: r.primaryTiming ?? 'rt',
        defaultSubcategoryHash: r.defaultSubcategoryHash ?? null,
        sortAscending: r.sortAscending ?? true,
    }));

    let selected: ResolvedCategory | null = null;
    if (categorySlug) {
        const norm = normalizeSlug(categorySlug);
        selected = categories.find((c) => c.name === norm) ?? null;
    }
    if (!selected) selected = categories[0] ?? null;

    return { categories, selected };
}

export async function getRecentPbs(
    gameId: number,
    limit = 10,
): Promise<RecentPb[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`recent-pbs:${gameId}`);

    const path = `/v1/finished-runs?game_id=${gameId}&is_pb=true&sort=-ended_at&limit=${limit}`;
    const body = await v1Fetch<{ result: { data: RecentPb[] } }>(path);
    return body.result?.data ?? [];
}
