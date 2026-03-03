'use server';

import { apiFetch } from './api-client';
import type { FinishedRunPB } from './highlights';

export interface FinishedRunsSearchParams {
    gameId?: number;
    category?: string;
    username?: string;
    isPb?: boolean;
    useGameTime?: boolean;
    minTime?: number;
    maxTime?: number;
    afterDate?: string;
    beforeDate?: string;
    sort?: string;
    page?: number;
    limit?: number;
}

interface FinishedRunsApiResponse {
    data: FinishedRunPB[];
    totalCount: number;
    limit: number;
    offset: number;
}

export interface FinishedRunsResult {
    items: FinishedRunPB[];
    totalCount: number;
    page: number;
    totalPages: number;
}

const DEFAULT_PAGE_SIZE = 10;

export async function searchFinishedRuns(
    params: FinishedRunsSearchParams,
): Promise<FinishedRunsResult> {
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const page = params.page ?? 1;
    const offset = (page - 1) * limit;

    const qs = new URLSearchParams();
    if (params.gameId != null) qs.set('game_id', String(params.gameId));
    if (params.category) qs.set('category', params.category);
    if (params.username) qs.set('username', params.username);
    if (params.isPb) qs.set('is_pb', 'true');
    if (params.useGameTime) qs.set('has_game_time', 'true');
    const timePrefix = params.useGameTime ? 'game_' : '';
    if (params.minTime != null)
        qs.set(`min_${timePrefix}time`, String(params.minTime * 1000));
    if (params.maxTime != null)
        qs.set(`max_${timePrefix}time`, String(params.maxTime * 1000));
    if (params.afterDate) qs.set('after_date', params.afterDate);
    if (params.beforeDate) qs.set('before_date', params.beforeDate);
    if (params.sort) qs.set('sort', params.sort);
    if (offset > 0) qs.set('offset', String(offset));
    qs.set('limit', String(limit));

    const response = await apiFetch<FinishedRunsApiResponse>(
        `/v1/finished-runs?${qs.toString()}`,
    );

    const totalPages = Math.ceil(response.totalCount / limit);

    return {
        items: response.data,
        totalCount: response.totalCount,
        page,
        totalPages,
    };
}
