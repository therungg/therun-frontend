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

export interface PaginatedFinishedRuns {
    items: FinishedRunPB[];
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export async function searchFinishedRuns(
    params: FinishedRunsSearchParams,
): Promise<PaginatedFinishedRuns> {
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
    if (params.page) qs.set('page', String(params.page));
    qs.set('limit', String(params.limit ?? 25));

    return apiFetch<PaginatedFinishedRuns>(
        `/v1/finished-runs?${qs.toString()}`,
    );
}
