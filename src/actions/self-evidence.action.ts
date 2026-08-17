'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ModError, meFetch } from '~src/lib/moderation/mod-fetch';
import { revalidateRunDetails } from '~src/lib/moderation/revalidate-boards';

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
    return { ok: true };
}

/**
 * Owner self-service: set/clear the evidence URL and/or description on your
 * own manual (set) time. Never sends `timeMs` — that field routes the same
 * backend endpoint to the existing-time re-timing path instead of this
 * evidence/description edit.
 */
export async function selfSetManualEvidenceAction(
    manualTimeId: number,
    input: { evidenceUrl?: string | null; description?: string | null },
): Promise<{ ok: true } | Fail> {
    const session = await getSession();
    if (!session?.id) return { error: 'You must be signed in.' };

    const body: {
        manualTimeId: number;
        evidenceUrl?: string | null;
        description?: string | null;
    } = { manualTimeId };
    if (input.evidenceUrl !== undefined) body.evidenceUrl = input.evidenceUrl;
    if (input.description !== undefined) body.description = input.description;

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
    revalidateTag(`manual-time:${manualTimeId}`, 'minutes');
    return { ok: true };
}
