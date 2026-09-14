'use server';

import { updateTag } from 'next/cache';
import { z } from 'zod';
import { type ActionResult, mapApiError } from '~src/lib/action-result';
import { apiFetch } from '~src/lib/api-client';
import { leaderboardsProfileTag } from '~src/lib/leaderboards-profile';
import type { LeaderboardsLayout } from '../../types/leaderboards-profile.types';
import { getSession } from './session.action';

const pinRef = z.object({
    kind: z.enum(['run', 'manual']),
    id: z.number().int().positive(),
});

const layoutSchema = z
    .object({
        mainGameId: z.number().int().positive().nullable(),
        pins: z.array(pinRef).max(6),
        videoPin: pinRef.nullable(),
        gameOrder: z.enum(['runners', 'rank', 'recent', 'name', 'manual']),
        manualGameIds: z.array(z.number().int().positive()).max(500),
        showActivity: z.boolean(),
    })
    .refine(
        (l) =>
            l.videoPin === null ||
            l.pins.some(
                (p) => p.kind === l.videoPin?.kind && p.id === l.videoPin?.id,
            ),
        'The video must be one of the pinned runs.',
    );

/** Saves the signed-in runner's own Leaderboards profile arrangement. */
export async function saveLeaderboardsLayout(
    layout: LeaderboardsLayout,
): Promise<ActionResult> {
    const session = await getSession();
    if (!session?.id || !session.username) {
        return { ok: false, error: 'You must be signed in.' };
    }
    const parsed = layoutSchema.safeParse(layout);
    if (!parsed.success) {
        return {
            ok: false,
            error: parsed.error.issues[0]?.message ?? 'Invalid layout',
        };
    }
    try {
        await apiFetch(`/users/${encodeURIComponent(session.username)}`, {
            method: 'PUT',
            sessionId: session.id,
            body: { leaderboardsLayout: parsed.data },
        });
    } catch (e) {
        return mapApiError(e);
    }
    updateTag(leaderboardsProfileTag(session.username));
    return { ok: true };
}
