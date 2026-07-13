'use server';

import { cacheLife, cacheTag } from 'next/cache';
import type {
    QuickStats,
    RecentPb,
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
} from '../../types/leaderboards.types';
import { isLowActivityCategory } from '../utils/format-stats';
import { V1FetchError, v1Fetch } from './v1-fetch';

interface GamesEndpointRow {
    gameId: number;
    gameDisplay: string;
    gameImage?: string | null;
    totalRunTime: number;
    totalAttemptCount: number;
    totalFinishedAttemptCount: number;
    uniqueRunners: number;
}

// /v1/runs/categories returns snake_case (unlike /v1/runs/games, which is camelCase).
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
    primary_timing?: string; // "realtime" | "gametime" | "rt" | "gt"
    hide_real_time?: boolean;
    hide_game_time?: boolean;
    sort_ascending?: boolean;
    default_verified?: boolean;
    rules?: string | null;
    show_milliseconds?: boolean;
    require_video?: boolean;
    require_video_top_n?: number | null;
}

function normalizeSlug(slug: string): string {
    return slug.toLowerCase().replace(/[\s-]+/g, '');
}

export async function resolveGame(slug: string): Promise<ResolvedGame | null> {
    'use cache';
    cacheLife('hours');
    const normalized = normalizeSlug(slug);
    cacheTag(`game-resolve:${normalized}`);

    let lookup: {
        result: {
            id: number;
            name: string;
            display: string;
            redirectedToGameId?: number | null;
            redirectedToSlug?: string | null;
        };
    };
    try {
        lookup = await v1Fetch(
            `/v1/games/by-slug/${encodeURIComponent(normalized)}`,
        );
    } catch (e) {
        if (e instanceof V1FetchError && e.status === 404) return null;
        throw e;
    }
    const { id, name, display } = lookup.result;

    let image: string | null = null;
    try {
        const body = await v1Fetch<{ result: GamesEndpointRow[] }>(
            `/v1/runs/games?game_id=${id}&limit=1`,
        );
        image = body.result?.[0]?.gameImage ?? null;
    } catch {
        // Image is non-essential; degrade gracefully.
    }

    return {
        id,
        name,
        display,
        image,
        redirectedToGameId: lookup.result.redirectedToGameId ?? null,
        redirectedToSlug: lookup.result.redirectedToSlug ?? null,
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

interface PageDataCategoryFlags {
    id: number;
    isMain?: boolean;
    active?: boolean;
}

interface PageDataGroup {
    id: number;
    name: string;
    sortOrder?: number;
    categories?: PageDataCategoryFlags[];
}

interface PageDataForCats {
    ungroupedCategories?: PageDataCategoryFlags[];
    groups?: PageDataGroup[];
}

export async function resolveCategory(
    gameId: number,
    categorySlug?: string,
): Promise<{
    categories: ResolvedCategory[];
    selected: ResolvedCategory | null;
    groups: ResolvedGroup[];
}> {
    'use cache';
    cacheLife('minutes');
    // Cache is keyed by gameId only; categorySlug is used post-fetch to pick
    // one entry from the cached list, so it intentionally shares cache across
    // category selections for the same game.
    cacheTag(`game-cats:${gameId}`);

    const runsPath = `/v1/runs/categories?game_id=${gameId}&sort=-total_run_time&limit=200`;
    const [runsResp, pageDataResp] = await Promise.all([
        v1Fetch<{ result: CategoriesEndpointRow[] }>(runsPath),
        v1Fetch<{ result?: PageDataForCats }>(`/v1/games/${gameId}`).catch(
            () => ({ result: undefined as PageDataForCats | undefined }),
        ),
    ]);

    const flagsById = new Map<number, { isMain: boolean; active: boolean }>();
    const groupByCatId = new Map<number, { id: number; name: string }>();
    for (const c of pageDataResp.result?.ungroupedCategories ?? []) {
        flagsById.set(c.id, {
            isMain: c.isMain ?? false,
            active: c.active ?? true,
        });
    }
    for (const g of pageDataResp.result?.groups ?? []) {
        for (const c of g.categories ?? []) {
            flagsById.set(c.id, {
                isMain: c.isMain ?? false,
                active: c.active ?? true,
            });
            groupByCatId.set(c.id, { id: g.id, name: g.name });
        }
    }

    const groups: ResolvedGroup[] = (pageDataResp.result?.groups ?? [])
        .map((g) => ({ id: g.id, name: g.name, sortOrder: g.sortOrder ?? 0 }))
        .sort((a, b) => a.sortOrder - b.sortOrder);

    const rows = (runsResp.result ?? []).filter(
        (r) =>
            !isLowActivityCategory({
                totalRunTime: r.total_run_time,
                totalFinishedAttemptCount: r.total_finished_attempt_count,
            }),
    );
    const categories: ResolvedCategory[] = rows.map((r) => {
        const flags = flagsById.get(r.category_id);
        const grp = groupByCatId.get(r.category_id) ?? null;
        return {
            id: r.category_id,
            name: normalizeSlug(r.category_display),
            display: r.category_display,
            primaryTiming:
                r.primary_timing === 'gt' || r.primary_timing === 'gametime'
                    ? ('gt' as const)
                    : ('rt' as const),
            sortAscending: r.sort_ascending ?? true,
            isMain: flags?.isMain ?? false,
            active: flags?.active ?? true,
            groupId: grp?.id ?? null,
            groupName: grp?.name ?? null,
            totalRunTime: r.total_run_time,
            totalAttemptCount: r.total_attempt_count,
            totalFinishedAttemptCount: r.total_finished_attempt_count,
            uniqueRunners: r.unique_runners,
            rules: r.rules ?? null,
            showMilliseconds: r.show_milliseconds ?? true,
            requireVideo: r.require_video ?? false,
            requireVideoTopN: r.require_video_top_n ?? null,
            hideRealTime: r.hide_real_time ?? false,
            hideGameTime: r.hide_game_time ?? false,
        };
    });

    let selected: ResolvedCategory | null = null;
    if (categorySlug) {
        const norm = normalizeSlug(categorySlug);
        selected = categories.find((c) => c.name === norm) ?? null;
    }
    if (!selected) selected = categories[0] ?? null;

    return { categories, selected, groups };
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
