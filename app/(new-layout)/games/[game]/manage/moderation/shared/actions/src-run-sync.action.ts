'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError, apiFetch } from '~src/lib/api-client';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import {
    revalidateBoardsForRuleScope,
    revalidateRunDetails,
} from '~src/lib/moderation/revalidate-boards';
import type { SrcConflictChoice } from '../../../../../../../../types/src-run-conflicts.types';

type Result = { ok: true } | { error: string; code?: number };

async function post(
    gameSlug: string,
    runId: number,
    path: string,
    body?: unknown,
): Promise<Result> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };
    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }
    try {
        await apiFetch(`/games/${game.id}/src-import/${path}`, {
            sessionId: session.id,
            method: 'POST',
            body,
        });
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message, code: e.status };
        return { error: 'Something went wrong. Please try again.' };
    }
    revalidateRunDetails([runId]);
    await revalidateBoardsForRuleScope(game.id, game.name, null);
    return { ok: true };
}

export async function resolveSrcConflictAction(
    gameSlug: string,
    runId: number,
    conflictId: number,
    choice: SrcConflictChoice,
): Promise<Result> {
    return post(gameSlug, runId, `run-sync/conflicts/${conflictId}/resolve`, {
        choice,
    });
}

export async function putBackRunAction(
    gameSlug: string,
    runId: number,
): Promise<Result> {
    return post(gameSlug, runId, `runs/${runId}/put-back`);
}
