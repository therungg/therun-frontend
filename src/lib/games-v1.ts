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
    game_id: number;
    game_display: string;
    game_image?: string | null;
    total_run_time: number;
    total_attempt_count: number;
    total_finished_attempt_count: number;
    unique_runners: number;
}

interface CategoriesEndpointRow {
    game_id: number;
    category_id: number;
    game_display: string;
    category_display: string;
    game_image?: string | null;
    total_run_time: number;
    total_attempt_count: number;
    total_finished_attempt_count: number;
    unique_runners: number;
    primary_timing?: 'rt' | 'gt';
    default_subcategory_hash?: string | null;
    sort_ascending?: boolean;
    default_verified?: boolean;
}

function normalizeSlug(slug: string): string {
    return slug.toLowerCase().replace(/\s+/g, '');
}

export async function resolveGame(slug: string): Promise<ResolvedGame | null> {
    'use cache';
    cacheLife('hours');
    const normalized = normalizeSlug(slug);
    cacheTag(`game-resolve:${normalized}`);

    const path = `/v1/runs/games?game=${encodeURIComponent(normalized)}&limit=1`;
    const body = await v1Fetch<{ result: GamesEndpointRow[] }>(path);
    const row = body.result?.[0];
    if (!row) return null;

    return {
        id: row.game_id,
        name: row.game_display.toLowerCase().replace(/\s+/g, ''),
        display: row.game_display,
        image: row.game_image ?? null,
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
        totalRunTime: row.total_run_time,
        totalAttemptCount: row.total_attempt_count,
        totalFinishedAttemptCount: row.total_finished_attempt_count,
        uniqueRunners: row.unique_runners,
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
        id: r.category_id,
        name: r.category_display.toLowerCase().replace(/\s+/g, ''),
        display: r.category_display,
        primaryTiming: r.primary_timing ?? 'rt',
        defaultSubcategoryHash: r.default_subcategory_hash ?? null,
        sortAscending: r.sort_ascending ?? true,
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
    const body = await v1Fetch<{ result: RecentPb[] }>(path);
    return body.result ?? [];
}
