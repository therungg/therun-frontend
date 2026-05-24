'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { exclude } from '~src/lib/moderation/mass-mgmt';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { revalidateAffectedBoards } from '~src/lib/moderation/revalidate-boards';
import { listQueue, resolveFlag } from '~src/lib/moderation/triage';
import { applyVerdicts } from '~src/lib/moderation/verdicts';
import type {
    QueueFilter,
    QueueItem,
} from '../../../../../../../../types/moderation.types';

export async function loadQueueAction(
    gameSlug: string,
    filter: QueueFilter,
): Promise<{ ok: true; items: QueueItem[] } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        const items = await listQueue(session.id, game.id, {
            ...filter,
            limit: 100,
        });
        return { ok: true, items };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to load queue.' };
    }
}

export async function resolveFlagAction(
    gameSlug: string,
    flagId: number,
    reason: string,
): Promise<{ ok: true } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        await resolveFlag(session.id, game.id, flagId, reason);
        return { ok: true };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to resolve flag.' };
    }
}

export async function quickVerdictAction(
    gameSlug: string,
    runId: number,
    action: 'verify' | 'reject',
    reason: string,
): Promise<{ ok: true } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        const result = await applyVerdicts(session.id, game.id, {
            action,
            runIds: [runId],
            reason,
        });
        await revalidateAffectedBoards(
            game.id,
            game.name,
            result.affectedLeaderboards,
        );
        return { ok: true };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to apply verdict.' };
    }
}

export async function quickExcludeAction(
    gameSlug: string,
    runId: number,
    reason: string,
): Promise<{ ok: true } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        const result = await exclude(session.id, game.id, {
            runIds: [runId],
            reason,
        });
        if ('affectedLeaderboards' in result) {
            await revalidateAffectedBoards(
                game.id,
                game.name,
                result.affectedLeaderboards,
            );
        }
        return { ok: true };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to exclude run.' };
    }
}
