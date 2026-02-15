'use server';

import { cacheLife, cacheTag } from 'next/cache';
import { apiFetch } from './api-client';

// --- Types ---

export interface GlobalStats {
    totalRunTime: number;
    totalAttemptCount: number;
    totalFinishedAttemptCount: number;
    totalRunners: number;
}

export interface TodayStats {
    runCount: number;
    pbCount: number;
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

// --- Data fetching ---

export async function getGlobalStats(): Promise<GlobalStats> {
    'use cache';
    cacheLife('minutes');
    cacheTag('global-stats');

    return apiFetch<GlobalStats>('/v1/runs/global-stats');
}

export async function getTodayStats(): Promise<TodayStats> {
    'use cache';
    cacheLife('seconds');
    cacheTag('today-stats');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const afterDate = today.toISOString();

    const [runData, pbData] = await Promise.all([
        apiFetch<{ count: number }>(
            `/v1/finished-runs?aggregate=count&after_date=${afterDate}`,
        ),
        apiFetch<{ count: number }>(
            `/v1/finished-runs?aggregate=count&after_date=${afterDate}&is_pb=true`,
        ),
    ]);

    return { runCount: runData.count, pbCount: pbData.count };
}

export interface PeriodStats {
    runCount: number;
    pbCount: number;
}

export async function getPeriodStats(
    period: 'day' | 'week' | 'month',
): Promise<PeriodStats> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`period-stats-${period}`);

    const afterDate = getPeriodStartDate(period).toISOString();

    const [runData, pbData] = await Promise.all([
        apiFetch<{ count: number }>(
            `/v1/finished-runs?aggregate=count&after_date=${afterDate}`,
        ),
        apiFetch<{ count: number }>(
            `/v1/finished-runs?aggregate=count&after_date=${afterDate}&is_pb=true`,
        ),
    ]);

    return { runCount: runData.count, pbCount: pbData.count };
}

export async function getPreviousPeriodStats(
    period: 'day' | 'week' | 'month',
): Promise<PeriodStats> {
    'use cache';
    cacheLife('hours');
    cacheTag(`prev-period-stats-${period}`);

    const currentStart = getPeriodStartDate(period);
    const previousStart = getPeriodStartDate(period, 1);

    const afterDate = previousStart.toISOString();
    const beforeDate = currentStart.toISOString();

    const [runData, pbData] = await Promise.all([
        apiFetch<{ count: number }>(
            `/v1/finished-runs?aggregate=count&after_date=${afterDate}&before_date=${beforeDate}`,
        ),
        apiFetch<{ count: number }>(
            `/v1/finished-runs?aggregate=count&after_date=${afterDate}&before_date=${beforeDate}&is_pb=true`,
        ),
    ]);

    return { runCount: runData.count, pbCount: pbData.count };
}

function getPeriodStartDate(
    period: 'day' | 'week' | 'month',
    offset = 0,
): Date {
    const date = new Date();
    if (period === 'day') {
        date.setDate(date.getDate() - offset);
        date.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
        date.setDate(date.getDate() - 7 * (1 + offset));
        date.setHours(0, 0, 0, 0);
    } else {
        date.setMonth(date.getMonth() - offset, 1);
        date.setHours(0, 0, 0, 0);
    }
    return date;
}

export async function getRecentNotablePBs(
    limit = 20,
): Promise<FinishedRunPB[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag('notable-pbs');

    return apiFetch<FinishedRunPB[]>(
        `/v1/finished-runs?top_categories=100&is_pb=true&sort=-ended_at&limit=${limit}`,
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
