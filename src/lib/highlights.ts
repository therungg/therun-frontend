'use server';

import { cacheLife, cacheTag } from 'next/cache';
import { apiFetch } from './api-client';

// --- Types ---

export interface GlobalStats {
    totalRunTime: number;
    totalAttemptCount: number;
    totalFinishedAttemptCount: number;
    totalRunners: number;
    totalGames: number;
    totalCategories: number;
    totalPbs: number;
    totalPbsWithPrevious: number;
    totalRaces: number;
}

export interface CategoryStats {
    gameId: number;
    categoryId: number;
    gameDisplay: string;
    categoryDisplay: string;
    gameImage: string | null;
    totalRunTime: number;
    totalAttemptCount: number;
    totalFinishedAttemptCount: number;
    uniqueRunners: number;
}

export interface FinishedRunPB {
    id: number;
    username: string;
    game: string;
    category: string;
    time: number;
    gameTime: number | null;
    startedAt: string;
    endedAt: string;
    isPb: boolean;
    isPbGametime: boolean;
    previousPb: number | null;
    previousPbGameTime: number | null;
    platform: string | null;
    emulator: boolean;
    runId: number;
    gameId: number;
    categoryId: number;
    personalBest: number;
    sumOfBests: number;
    attemptCount: number;
    finishedAttemptCount: number;
    totalRunTime: number;
}

export interface ActiveGame {
    game: string;
    runCount: string;
    uniqueRunners: string;
}

export interface GameWithImage {
    gameId: number;
    gameDisplay: string;
    gameImage: string;
    totalRunTime: number;
    totalAttemptCount: number;
    totalFinishedAttemptCount: number;
    uniqueRunners: number;
}

export interface WeeklyRunner {
    username: string;
    value: string;
}

export interface GameActivity {
    gameId: number;
    gameDisplay: string;
    gameImage: string;
    totalPlaytime: number;
    totalAttempts: number;
    totalFinishedAttempts: number;
    totalPbs: number;
    totalPbsWithPrevious: number;
    uniquePlayers: number;
}

export interface CategoryActivity extends GameActivity {
    categoryId: number;
    categoryDisplay: string;
}

// --- Data fetching ---

export async function getGlobalStats(offset?: string): Promise<GlobalStats> {
    'use cache';
    cacheLife('minutes');
    cacheTag(offset ? `global-stats-${offset}` : 'global-stats');

    const query = offset ? `?offset=${offset}` : '';
    return apiFetch<GlobalStats>(`/v1/runs/global-stats${query}`);
}

export async function getRecentNotablePBs(limit = 5): Promise<FinishedRunPB[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag('notable-pbs');

    return apiFetch<FinishedRunPB[]>(
        `/v1/finished-runs?top_categories=250&min_playtime=50&is_pb=true&sort=-ended_at&limit=${limit}`,
    );
}

export async function getRecentPBs(limit = 20): Promise<FinishedRunPB[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag('recent-pbs');

    return apiFetch<FinishedRunPB[]>(
        `/v1/finished-runs?is_pb=true&sort=-ended_at&limit=${limit}`,
    );
}

export async function getMostActiveGames(
    period: 'day' | 'week' | 'month' = 'week',
): Promise<ActiveGame[]> {
    'use cache';
    cacheLife('hours');
    cacheTag('active-games');

    return apiFetch<ActiveGame[]>(
        `/v1/runs/stats?type=most_active_games&period=${period}`,
    );
}

export async function getGameImageMap(): Promise<Record<string, string>> {
    'use cache';
    cacheLife('hours');
    cacheTag('game-images');

    const games = await apiFetch<GameWithImage[]>(
        '/v1/runs/games?sort=-unique_runners&limit=200',
    );
    const map: Record<string, string> = {};
    for (const g of games) {
        if (g.gameImage && g.gameImage !== 'noimage' && g.gameImage !== '') {
            map[g.gameDisplay] = g.gameImage;
        }
    }
    return map;
}

export async function getTopGames(limit = 3): Promise<GameWithImage[]> {
    'use cache';
    cacheLife('hours');
    cacheTag('top-games');

    return apiFetch<GameWithImage[]>(
        `/v1/runs/games?sort=-total_run_time&limit=${limit}`,
    );
}

export async function getTopCategoriesForGame(
    gameId: number,
    limit = 3,
): Promise<CategoryStats[]> {
    'use cache';
    cacheLife('hours');
    cacheTag(`top-categories-${gameId}`);

    return apiFetch<CategoryStats[]>(
        `/v1/runs/categories?game_id=${gameId}&sort=-total_run_time&limit=${limit}`,
    );
}

export async function getGameActivity(
    from: string,
    to: string,
    limit = 6,
    minPlayers = 2,
): Promise<GameActivity[]> {
    'use cache';
    cacheLife('hours');
    cacheTag(`game-activity-${from}-${to}`);

    return apiFetch<GameActivity[]>(
        `/games/activity?from=${from}&to=${to}&type=games&minPlayers=${minPlayers}&limit=${limit}`,
    );
}

export async function getCategoryActivityForGame(
    gameId: number,
    from: string,
    to: string,
    limit = 2,
): Promise<CategoryActivity[]> {
    'use cache';
    cacheLife('hours');
    cacheTag(`category-activity-${gameId}-${from}-${to}`);

    return apiFetch<CategoryActivity[]>(
        `/games/activity?from=${from}&to=${to}&type=categories&gameId=${gameId}&limit=${limit}`,
    );
}

export async function getWeeklyTopRunners(limit = 10): Promise<WeeklyRunner[]> {
    'use cache';
    cacheLife('hours');
    cacheTag('top-runners');

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    return apiFetch<WeeklyRunner[]>(
        `/v1/finished-runs?aggregate=sum&field=time&group_by=username&after_date=${weekAgo.toISOString()}&sort=-value&limit=${limit}`,
    );
}

export async function getMostPBsRunners(limit = 10): Promise<WeeklyRunner[]> {
    'use cache';
    cacheLife('hours');
    cacheTag('pb-runners');

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    return apiFetch<WeeklyRunner[]>(
        `/v1/finished-runs?aggregate=count&group_by=username&after_date=${weekAgo.toISOString()}&is_pb=true&sort=-value&limit=${limit}`,
    );
}

export async function getLiveCount(): Promise<number> {
    'use cache';
    cacheLife('seconds');
    cacheTag('live-count');

    const res = await fetch('https://api.therun.gg/live/count');
    if (!res.ok) return 0;
    const data = await res.json();
    return data.result ?? data.count ?? 0;
}
