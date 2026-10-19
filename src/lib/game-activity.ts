'use server';

import { cacheLife, cacheTag } from 'next/cache';
import { apiFetch } from './api-client';

export interface GameActivityPoint {
    /** Bucket start, YYYY-MM-DD (day buckets are the day itself). */
    date: string;
    /** ms */
    playtime: number;
    attempts: number;
    finishedAttempts: number;
    pbs: number;
    uniquePlayers: number;
}

interface RawPoint {
    date: string;
    // bigint sums serialize as strings.
    totalPlaytime: number | string;
    totalAttempts: number | string;
    totalFinishedAttempts: number | string;
    totalPbs: number | string;
    uniquePlayers: number;
}

/**
 * Date-bucketed activity for one game — `/games/activity?group_by=date`,
 * the endpoint added for the game page's activity chart + hero sparkline
 * (docs/plans/2026-08-07-game-page-stats-plan.md, handoff #1). Dates are
 * YYYY-MM-DD; buckets with no activity are absent, not zero — chart
 * consumers must fill gaps themselves.
 */
export async function getGameActivityTimeseries(
    gameId: number,
    from: string,
    to: string,
    bucket: 'day' | 'week' = 'day',
    categoryId?: number,
): Promise<GameActivityPoint[]> {
    'use cache';
    cacheLife('hours');
    cacheTag(`game-activity-ts:${gameId}`);

    const categoryParam = categoryId != null ? `&categoryId=${categoryId}` : '';
    const rows = await apiFetch<RawPoint[]>(
        `/games/activity?group_by=date&gameId=${gameId}&from=${from}&to=${to}&bucket=${bucket}${categoryParam}`,
    );
    return (rows ?? []).map((r) => ({
        date: r.date,
        playtime: Number(r.totalPlaytime) || 0,
        attempts: Number(r.totalAttempts) || 0,
        finishedAttempts: Number(r.totalFinishedAttempts) || 0,
        pbs: Number(r.totalPbs) || 0,
        uniquePlayers: Number(r.uniquePlayers) || 0,
    }));
}
