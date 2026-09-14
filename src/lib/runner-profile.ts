import { cacheLife, cacheTag } from 'next/cache';
import type {
    RunnerActivity,
    RunnerProfileHead,
    RunnerStats,
} from '../../types/runner-profile.types';
import { ApiError, apiFetch } from './api-client';

type Part = 'head' | 'activity' | 'stats';

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

/** Identity, headline numbers, layout and chapter flags. Null when the name is nobody. */
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
