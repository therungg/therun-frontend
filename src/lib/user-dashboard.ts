'use server';

import { cacheLife, cacheTag } from 'next/cache';
import type {
    DashboardPeriod,
    DashboardResponse,
} from '~src/types/dashboard.types';
import { apiFetch } from './api-client';

export async function getUserDashboard(
    username: string,
    period: DashboardPeriod = '7d',
): Promise<DashboardResponse | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`user-dashboard-${username}`);

    try {
        return await apiFetch<DashboardResponse>(
            `/v1/users/${encodeURIComponent(username)}/dashboard?period=${period}`,
        );
    } catch {
        return null;
    }
}

export async function getUserDashboardCustomRange(
    username: string,
    from: string,
    to?: string,
): Promise<DashboardResponse | null> {
    const params = new URLSearchParams({ from });
    if (to) params.set('to', to);

    try {
        return await apiFetch<DashboardResponse>(
            `/v1/users/${encodeURIComponent(username)}/dashboard?${params}`,
        );
    } catch {
        return null;
    }
}
