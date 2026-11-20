'use server';

import { updateTag } from 'next/cache';
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
