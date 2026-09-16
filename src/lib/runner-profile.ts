import { cacheLife, cacheTag } from 'next/cache';
import type { LeaderboardsProfile } from '../../types/leaderboards-profile.types';
import type {
    RunnerActivity,
    RunnerProfileHead,
    RunnerStats,
} from '../../types/runner-profile.types';
import { ApiError, apiFetch } from './api-client';

type Part = 'head' | 'activity' | 'stats' | 'boards';

export const runnerProfileTag = (name: string, part?: Part) =>
    part
        ? `runner-profile:${name.toLowerCase()}:${part}`
        : `runner-profile:${name.toLowerCase()}`;

async function getPart<T>(name: string, part: Part): Promise<T | null> {
    try {
        return await apiFetch<T>(
            `/users/global/${encodeURIComponent(name)}?part=${part}`,
        );
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
    }
}

/** Identity, layout and chapter flags. Null when the name is nobody. */
export async function getRunnerProfileHead(
    name: string,
): Promise<RunnerProfileHead | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag(runnerProfileTag(name), runnerProfileTag(name, 'head'));
    return getPart<RunnerProfileHead>(name, 'head');
}

/** A year of activity. Null for guests and unknown names. */
export async function getRunnerActivity(
    name: string,
): Promise<RunnerActivity | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag(runnerProfileTag(name), runnerProfileTag(name, 'activity'));
    return getPart<RunnerActivity>(name, 'activity');
}

/** Every game and splits record. Null for guests and unknown names. */
export async function getRunnerStats(
    name: string,
): Promise<RunnerStats | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag(runnerProfileTag(name), runnerProfileTag(name, 'stats'));
    return getPart<RunnerStats>(name, 'stats');
}

/** Only the runner's best `limit` board entries; the standing still counts everything. */
export async function getRunnerBoardsTop(
    name: string,
    limit: number,
): Promise<LeaderboardsProfile | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag(runnerProfileTag(name), runnerProfileTag(name, 'boards'));
    try {
        return await apiFetch<LeaderboardsProfile>(
            `/users/global/${encodeURIComponent(name)}?part=boards&limit=${limit}`,
        );
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
    }
}
