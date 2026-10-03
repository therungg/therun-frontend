'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { leaderboardsProfileTag } from '~src/lib/leaderboards-profile';
import { ModError, meFetch } from '~src/lib/moderation/mod-fetch';
import { revalidateRunDetails } from '~src/lib/moderation/revalidate-boards';
import { getRunByIdAsViewer } from '~src/lib/run-detail-viewer';

type Fail = { error: string };

/**
 * Owner self-service: set/clear the VOD URL and/or description on your own
 * leaderboard run. Server-authoritative — the backend refuses (verified runs,
 * revoked description rights, etc.) surface via `ModError.message`.
 */
export async function selfSetEvidenceAction(
    runId: number,
    input: { vodUrl?: string | null; description?: string | null },
): Promise<{ ok: true } | Fail> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };

    const body: { vodUrl?: string | null; description?: string | null } = {};
    if (input.vodUrl !== undefined) body.vodUrl = input.vodUrl;
    if (input.description !== undefined) body.description = input.description;

    try {
        await meFetch(`/v1/me/runs/${runId}/evidence`, {
            sessionId: session.id,
            method: 'POST',
            body,
        });
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Something went wrong. Please try again.' };
    }
    revalidateRunDetails([runId]);
    // Adding a video (etc.) can move this run's status on the runner's own
    // Leaderboards tab (e.g. out of "needs you") — expire it same as
    // `revalidateSelfBoardsAction`.
    if (session.username) updateTag(leaderboardsProfileTag(session.username));
    return { ok: true };
}

export interface OwnEvidence {
    vodUrl: string | null;
    description: string | null;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    descriptionRevoked: boolean;
}

/**
 * The video and description of one of your own runs, read as you (uncached),
 * for editors that start from a list row rather than the run page.
 * Owner-only fields such as the description restriction only come back on
 * this read.
 */
export async function loadOwnEvidenceAction(
    runId: number,
): Promise<{ ok: true; evidence: OwnEvidence } | Fail> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        const run = await getRunByIdAsViewer(runId, session.id);
        if (!run) return { error: 'This run no longer exists.' };
        return {
            ok: true,
            evidence: {
                vodUrl: run.vodUrl,
                description: run.description ?? null,
                verificationStatus: run.verificationStatus,
                descriptionRevoked: run.descriptionRestriction != null,
            },
        };
    } catch {
        return { error: 'Something went wrong. Please try again.' };
    }
}
