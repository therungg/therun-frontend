import { cacheLife, cacheTag } from 'next/cache';
import type {
    LeaderboardsProfile,
    LeaderboardsProfileEntry,
} from '../../types/leaderboards-profile.types';
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

/**
 * Rejected entries the viewer may see (their own, or on boards they
 * moderate). Not a server action: takes a session id and must only be
 * called from server components. Never cached — it is per viewer.
 */
export async function getRejectedEntriesAsViewer(
    name: string,
    sessionId: string,
): Promise<LeaderboardsProfileEntry[]> {
    try {
        const body = await apiFetch<{ entries: LeaderboardsProfileEntry[] }>(
            `/users/global/${encodeURIComponent(name)}?profile=1&rejected=1`,
            { sessionId, cache: 'no-store' },
        );
        return body.entries ?? [];
    } catch (e) {
        if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
            return [];
        }
        throw e;
    }
}
