'use server';

import { updateTag } from 'next/cache';
import type { SrcUserSyncStatus } from 'types/src-import.types';
import { getSession } from '~src/actions/session.action';
import { ApiError, apiFetch } from '~src/lib/api-client';
import { leaderboardsProfileTag } from '~src/lib/leaderboards-profile';

const ME_SYNC = '/src-import/me/sync';

export type SyncResult =
    | { status: SrcUserSyncStatus }
    | { error: string; code?: number };

async function call(
    path: string,
    method: 'GET' | 'POST' | 'PATCH',
    body?: unknown,
): Promise<SyncResult> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        const status = await apiFetch<SrcUserSyncStatus>(`${ME_SYNC}${path}`, {
            sessionId: session.id,
            method,
            body,
        });
        return { status };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message, code: e.status };
        return { error: 'Something went wrong. Please try again.' };
    }
}

async function dropProfileCache() {
    const session = await getSession();
    if (!session?.username) return;
    updateTag(leaderboardsProfileTag(session.username));
    updateTag(`user-rankings:name:${session.username.toLowerCase()}`);
}

export async function getMySyncStatus(): Promise<SyncResult> {
    return call('', 'GET');
}

export async function setMyDailySync(daily: boolean): Promise<SyncResult> {
    return call('', 'PATCH', { daily });
}

export async function lookUpMySrcAccount(): Promise<SyncResult> {
    return call('/lookup', 'POST');
}

export async function requestMySrcAccount(
    username: string,
    consentText: string,
): Promise<SyncResult> {
    return call('/request', 'POST', { username, consentText });
}

export async function confirmMySrcAccount(
    consentText: string,
): Promise<SyncResult> {
    const res = await call('/confirm', 'POST', { consentText });
    if ('status' in res) await dropProfileCache();
    return res;
}

export async function syncMyRunsNow(): Promise<SyncResult> {
    return call('/now', 'POST');
}

export async function unlinkMySrcAccount(): Promise<SyncResult> {
    return call('/unlink', 'POST');
}
