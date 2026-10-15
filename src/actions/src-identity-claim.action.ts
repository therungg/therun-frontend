'use server';

import { updateTag } from 'next/cache';
import type {
    SrcIdentityClaim,
    SrcIdentitySuggestion,
} from 'types/src-import.types';
import { getSession } from '~src/actions/session.action';
import { leaderboardsProfileTag } from '~src/lib/leaderboards-profile';
import { ModError, meFetch } from '~src/lib/moderation/mod-fetch';

type Fail = { error: string };

const BASE = '/v1/me/src-identity';

const fail = (e: unknown): Fail => ({
    error:
        e instanceof ModError
            ? e.message
            : 'Something went wrong. Please try again.',
});

export async function getSrcIdentitySuggestion(): Promise<SrcIdentitySuggestion | null> {
    const session = await getSession();
    if (!session?.id) return null;
    try {
        return (
            (await meFetch<SrcIdentitySuggestion | null>(`${BASE}/suggestion`, {
                sessionId: session.id,
            })) ?? null
        );
    } catch {
        return null;
    }
}

export async function claimSrcIdentity(
    srcUserId: string,
): Promise<SrcIdentityClaim | Fail> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    let claim: SrcIdentityClaim;
    try {
        claim = await meFetch<SrcIdentityClaim>(`${BASE}/claim`, {
            sessionId: session.id,
            method: 'POST',
            body: { srcUserId },
        });
    } catch (e) {
        return fail(e);
    }
    if (session.username) {
        updateTag(leaderboardsProfileTag(session.username));
        updateTag(`user-rankings:name:${session.username.toLowerCase()}`);
    }
    return claim;
}

export async function denySrcIdentityLink(): Promise<
    { denied: true; restoredRuns: number } | Fail
> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    let res: { denied: true; restoredRuns: number };
    try {
        res = await meFetch<{ denied: true; restoredRuns: number }>(
            `${BASE}/deny`,
            {
                sessionId: session.id,
                method: 'POST',
            },
        );
    } catch (e) {
        return fail(e);
    }
    if (session.username) {
        updateTag(leaderboardsProfileTag(session.username));
        updateTag(`user-rankings:name:${session.username.toLowerCase()}`);
    }
    return res;
}

export async function dismissSrcIdentitySuggestion(): Promise<
    { dismissed: true } | Fail
> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        return await meFetch<{ dismissed: true }>(`${BASE}/dismiss`, {
            sessionId: session.id,
            method: 'POST',
        });
    } catch (e) {
        return fail(e);
    }
}
