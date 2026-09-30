'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { leaderboardsProfileTag } from '~src/lib/leaderboards-profile';
import { ModError, meFetch } from '~src/lib/moderation/mod-fetch';
import { revalidateRunDetails } from '~src/lib/moderation/revalidate-boards';
import {
    getManualTimeByIdAsViewer,
    getRunByIdAsViewer,
} from '~src/lib/run-detail-viewer';

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

/**
 * Owner self-service: set/clear the evidence URL and/or description on your
 * own manual (set) time, or whether it was on an emulator. Never sends
 * `timeMs` — that field routes the same backend endpoint to the
 * existing-time re-timing path instead of this evidence/description edit.
 */
export async function selfSetManualEvidenceAction(
    manualTimeId: number,
    input: {
        evidenceUrl?: string | null;
        description?: string | null;
        emulator?: boolean;
    },
): Promise<{ ok: true } | Fail> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };

    const body: {
        manualTimeId: number;
        evidenceUrl?: string | null;
        description?: string | null;
        emulator?: boolean;
    } = { manualTimeId };
    if (input.evidenceUrl !== undefined) body.evidenceUrl = input.evidenceUrl;
    if (input.description !== undefined) body.description = input.description;
    if (input.emulator !== undefined) body.emulator = input.emulator;

    try {
        await meFetch('/v1/me/manual-times', {
            sessionId: session.id,
            method: 'POST',
            body,
        });
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Something went wrong. Please try again.' };
    }
    revalidateRunDetails([], [manualTimeId]);
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
 * The video and description of one of your own runs or manual times, read
 * as you (uncached), for editors that start from a list row rather than the
 * run page. Owner-only fields such as the description restriction only come
 * back on this read.
 */
export async function loadOwnEvidenceAction(
    kind: 'run' | 'manual',
    id: number,
): Promise<{ ok: true; evidence: OwnEvidence } | Fail> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };
    try {
        if (kind === 'run') {
            const run = await getRunByIdAsViewer(id, session.id);
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
        }
        const mt = await getManualTimeByIdAsViewer(id, session.id);
        if (!mt) return { error: 'This time no longer exists.' };
        return {
            ok: true,
            evidence: {
                vodUrl: mt.evidenceUrl,
                description: mt.description ?? null,
                verificationStatus: mt.verificationStatus,
                descriptionRevoked: mt.descriptionRestriction != null,
            },
        };
    } catch {
        return { error: 'Something went wrong. Please try again.' };
    }
}
