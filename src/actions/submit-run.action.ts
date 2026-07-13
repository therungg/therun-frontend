'use server';

import { getSession } from '~src/actions/session.action';
import { submitRun } from '~src/lib/me-submissions';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { revalidateRunDetails } from '~src/lib/moderation/revalidate-boards';
import type {
    SubmitRunInput,
    SubmitRunResult,
} from '../../types/leaderboards.types';

type Result<T = unknown> = ({ ok: true } & T) | { error: string };

function toError(e: unknown): { error: string } {
    if (e instanceof ModError) return { error: e.message };
    return { error: 'Something went wrong. Please try again.' };
}

/** Submit a run for a game/category you don't have a live timer feed for. */
export async function submitRunAction(
    input: SubmitRunInput,
): Promise<Result<SubmitRunResult>> {
    const s = await getSession();
    if (!s?.username || !s.id) {
        return { error: 'You must be signed in to submit a run.' };
    }
    try {
        const r = await submitRun(s.id, input);
        revalidateRunDetails([r.id]);
        return { ok: true, ...r };
    } catch (e) {
        return toError(e);
    }
}
