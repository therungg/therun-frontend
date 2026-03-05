import { cacheLife, cacheTag } from 'next/cache';
import type { UserPreferences } from '../../types/session.types';
import { apiFetch } from './api-client';

export async function getUserPreferences(
    username: string,
): Promise<UserPreferences> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`user-preferences-${username}`);

    try {
        const result = await apiFetch<UserPreferences>(
            `/users/${encodeURIComponent(username)}/preferences`,
        );
        return result ?? {};
    } catch {
        return {};
    }
}
