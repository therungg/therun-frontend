'use server';

import { updateTag } from 'next/cache';
import { z } from 'zod';
import { type ActionResult, mapApiError } from '~src/lib/action-result';
import { apiFetch } from '~src/lib/api-client';
import { leaderboardsProfileTag } from '~src/lib/leaderboards-profile';
import { runnerProfileTag } from '~src/lib/runner-profile';
import type { StripTab } from '../../types/runner-profile.types';
import { getSession } from './session.action';

const schema = z.object({
    tab: z.enum(['leaderboards', 'stats', 'activity', 'races']),
    ids: z
        .array(z.string().min(1).max(40))
        .max(5)
        .refine((ids) => new Set(ids).size === ids.length, 'Each stat once.'),
});

/** Saves which stats the signed-in runner's strip shows on one profile tab. */
export async function saveProfileStrip(
    tab: StripTab,
    ids: string[],
): Promise<ActionResult> {
    const session = await getSession();
    if (!session?.id || !session.username) {
        return { ok: false, error: 'You must be signed in.' };
    }
    const parsed = schema.safeParse({ tab, ids });
    if (!parsed.success) {
        return {
            ok: false,
            error: parsed.error.issues[0]?.message ?? 'Invalid stats',
        };
    }
    try {
        await apiFetch(`/users/${encodeURIComponent(session.username)}`, {
            method: 'PUT',
            sessionId: session.id,
            body: {
                profileLayout: {
                    strips: { [parsed.data.tab]: parsed.data.ids },
                },
            },
        });
    } catch (e) {
        return mapApiError(e);
    }
    updateTag(runnerProfileTag(session.username, 'head'));
    updateTag(leaderboardsProfileTag(session.username));
    return { ok: true };
}
