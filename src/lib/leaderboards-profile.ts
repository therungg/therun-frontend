import { cacheLife, cacheTag } from 'next/cache';
import type { LeaderboardsProfile } from '../../types/leaderboards-profile.types';
import { ApiError, apiFetch } from './api-client';

export const leaderboardsProfileTag = (name: string) =>
    `leaderboards-profile:${name.toLowerCase()}`;

export async function getLeaderboardsProfile(
    name: string,
): Promise<LeaderboardsProfile | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag(leaderboardsProfileTag(name));
    try {
        return await apiFetch<LeaderboardsProfile>(
            `/users/global/${encodeURIComponent(name)}?profile=1`,
        );
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
    }
}
