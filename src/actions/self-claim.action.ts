'use server';

import { getSession } from '~src/actions/session.action';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { selfCreateManualTime } from '~src/lib/moderation/self-service';
import type { SelfManualTimeInput } from '../../types/moderation.types';

/** Self-assert / correct your own leaderboard time (§E1). Trust-gated server-side. */
export async function selfClaimTimeAction(
    input: SelfManualTimeInput,
): Promise<
    | { ok: true; applied: 'instant' | 'provisional'; manualTimeId: number }
    | { error: string }
> {
    const s = await getSession();
    if (!s?.username || !s.id) {
        return { error: 'You must be signed in to submit a time.' };
    }
    try {
        const r = await selfCreateManualTime(s.id, input);
        return { ok: true, applied: r.applied, manualTimeId: r.manualTimeId };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Something went wrong. Please try again.' };
    }
}
