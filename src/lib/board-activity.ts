'use server';

import { cacheLife, cacheTag } from 'next/cache';
import { apiFetch } from './api-client';
import type { CategoryActivity } from './highlights';

/**
 * One week of a single board's activity, from `activity_daily` via
 * `/games/activity`. That endpoint only aggregates over a whole from..to
 * range — there is no per-day series — so the weekly shape here is built
 * from one call per week, each cached independently.
 */
export interface BoardWeeklyActivity {
    /** ISO date (UTC Monday) the week starts on. */
    weekStart: string;
    /** True while the week is still in progress — the last bucket. */
    partial: boolean;
    totalPlaytime: number;
    totalAttempts: number;
    totalFinishedAttempts: number;
    totalPbs: number;
    uniquePlayers: number;
}

// Not exported: 'use server' files may only export async functions.
const BOARD_ACTIVITY_WEEKS = 12;

async function getGameWeekActivity(
    gameId: number,
    from: string,
    to: string,
): Promise<CategoryActivity[]> {
    'use cache: remote';
    cacheLife('hours');
    cacheTag(`board-activity:${gameId}`);

    // limit=100: a board outside a giant game's 100 most-played categories
    // for a given week reads as zero activity that week, not as an error.
    return apiFetch<CategoryActivity[]>(
        `/games/activity?from=${from}&to=${to}&type=categories&gameId=${gameId}&limit=100`,
    );
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function utcMonday(d: Date): Date {
    const daysPastMonday = (d.getUTCDay() + 6) % 7;
    return new Date(
        Date.UTC(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate() - daysPastMonday,
        ),
    );
}

function addDays(d: Date, days: number): Date {
    return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * The last `BOARD_ACTIVITY_WEEKS` weeks of one category's activity, oldest
 * first. The final entry is the current (partial) week. Weeks the category
 * saw no activity come back as zero rows rather than gaps.
 */
export async function getBoardWeeklyActivity(
    gameId: number,
    categoryId: number,
): Promise<BoardWeeklyActivity[]> {
    const today = new Date();
    const currentMonday = utcMonday(today);

    const weeks = Array.from({ length: BOARD_ACTIVITY_WEEKS }, (_, i) => {
        const start = addDays(
            currentMonday,
            -7 * (BOARD_ACTIVITY_WEEKS - 1 - i),
        );
        const end = addDays(start, 6);
        const partial = end.getTime() > today.getTime();
        return {
            from: isoDay(start),
            to: partial ? isoDay(today) : isoDay(end),
            weekStart: isoDay(start),
            partial,
        };
    });

    const results = await Promise.all(
        weeks.map((w) => getGameWeekActivity(gameId, w.from, w.to)),
    );

    return weeks.map((w, i) => {
        const row = results[i].find((r) => r.categoryId === categoryId);
        // The wire sends the SUM() columns as strings ("1817"), despite
        // CategoryActivity declaring numbers — coerce before anything sums
        // or scales them.
        return {
            weekStart: w.weekStart,
            partial: w.partial,
            totalPlaytime: Number(row?.totalPlaytime ?? 0),
            totalAttempts: Number(row?.totalAttempts ?? 0),
            totalFinishedAttempts: Number(row?.totalFinishedAttempts ?? 0),
            totalPbs: Number(row?.totalPbs ?? 0),
            uniquePlayers: Number(row?.uniquePlayers ?? 0),
        };
    });
}
