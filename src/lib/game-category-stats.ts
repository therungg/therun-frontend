'use server';

import { cacheLife, cacheTag } from 'next/cache';
import type { StatsData } from '~src/types/game-stats.types';
import { safeEncodeURI } from '~src/utils/uri';
import { ApiError, apiFetch } from './api-client';

export interface GameCategorySummary {
    categoryName: string;
    categoryNameDisplay: string;
    /** Runners with a real-time PB. */
    runners: number;
    /** Runners with a game-time PB. */
    runnersGameTime: number;
    /** The board's timing: which clock it ranks by, and which it hides. */
    primaryTiming: 'realtime' | 'gametime';
    hideRealTime: boolean;
    hideGameTime: boolean;
}

// The backend matches games on their searchable name, as getGame does.
const searchable = (game: string) =>
    safeEncodeURI(game.toLowerCase().replace(/\s/g, ''));

/** A game's categories and runner counts, without their leaderboards. */
export async function getGameCategories(
    game: string,
): Promise<GameCategorySummary[] | null> {
    'use cache';
    cacheLife('hours');
    cacheTag(`game-categories:${game}`);

    try {
        const list = await apiFetch<unknown>(
            `/games/${searchable(game)}?categories=1`,
        );
        // A backend without the list answers with the whole game's stats.
        return Array.isArray(list) ? (list as GameCategorySummary[]) : null;
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
    }
}

/**
 * One category's game stats: the same shape as the whole game's, with only
 * that category's leaderboard in it, and without PBs under its board's
 * minimum time. The whole game outgrows a backend
 * response on the biggest games, so callers comparing runs ask for this.
 */
export async function getGameCategoryStats(
    game: string,
    category: string,
): Promise<StatsData | null> {
    'use cache';
    cacheLife('hours');
    cacheTag(`game-category-stats:${game}`);

    try {
        return (
            (await apiFetch<StatsData | undefined>(
                `/games/${searchable(game)}?category=${encodeURIComponent(category)}`,
            )) ?? null
        );
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
    }
}
