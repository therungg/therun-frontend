'use server';

import { apiFetch } from './api-client';
import type { FinishedRunPB } from './highlights';

export interface FinishedRunsSearchParams {
    game?: string;
    category?: string;
    username?: string;
    isPb?: boolean;
    minTime?: number;
    maxTime?: number;
    afterDate?: string;
    beforeDate?: string;
    sort?: string;
    page?: number;
    limit?: number;
}

export interface FinishedRunsResult {
    items: FinishedRunPB[];
    hasMore: boolean;
}

const PAGE_SIZE = 25;

export async function searchFinishedRuns(
    params: FinishedRunsSearchParams,
): Promise<FinishedRunsResult> {
    const limit = params.limit ?? PAGE_SIZE;
    const page = params.page ?? 1;
    const offset = (page - 1) * limit;

    const qs = new URLSearchParams();
    if (params.game) qs.set('game', params.game);
    if (params.category) qs.set('category', params.category);
    if (params.username) qs.set('username', params.username);
    if (params.isPb) qs.set('is_pb', 'true');
    if (params.minTime != null) qs.set('min_time', String(params.minTime));
    if (params.maxTime != null) qs.set('max_time', String(params.maxTime));
    if (params.afterDate) qs.set('after_date', params.afterDate);
    if (params.beforeDate) qs.set('before_date', params.beforeDate);
    if (params.sort) qs.set('sort', params.sort);
    if (offset > 0) qs.set('offset', String(offset));
    // Request one extra to detect if there are more pages
    qs.set('limit', String(limit + 1));

    const all = await apiFetch<FinishedRunPB[]>(
        `/v1/finished-runs?${qs.toString()}`,
    );

    const hasMore = all.length > limit;
    const items = hasMore ? all.slice(0, limit) : all;

    return { items, hasMore };
}
