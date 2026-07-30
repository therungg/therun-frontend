'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { createSiteBan, liftSiteBan } from '~src/lib/bans';
import { resolveGame } from '~src/lib/games-v1';
import { revalidateAffectedBoards } from '~src/lib/moderation/revalidate-boards';
import { defineAbilityFor } from '~src/rbac/ability';
import type { AffectedLeaderboard } from '../../../../../../../../types/moderation.types';

/**
 * Site-wide anonymize ban, filed from board curation. Admin-only — a game
 * moderator role is NOT enough (this bans the account everywhere). The
 * backend queues cross-game cache rebuilds itself; `board` is only used to
 * refresh the frontend cache for the board the admin is looking at.
 */
export async function anonymizeRunnerAction(
    gameSlug: string,
    input: { username: string; reason: string; board: AffectedLeaderboard },
): Promise<{ ok: true; banId: number } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };
    if (!defineAbilityFor(session).can('moderate', 'admins')) {
        return { error: 'Only site admins can anonymize a runner.' };
    }

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };

    try {
        const ban = await createSiteBan(session.id, {
            username: input.username,
            reason: input.reason,
            runTreatment: 'anonymize',
        });
        await revalidateAffectedBoards(game.id, game.name, [input.board]);
        return { ok: true, banId: ban.id };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to anonymize.' };
    }
}

/** Inverse of `anonymizeRunnerAction`, used only by its undo toast. */
export async function liftSiteBanAction(
    banId: number,
    gameSlug: string,
    board: AffectedLeaderboard,
): Promise<{ ok: true } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };
    if (!defineAbilityFor(session).can('moderate', 'admins')) {
        return { error: 'Only site admins can lift a site-wide ban.' };
    }

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };

    try {
        await liftSiteBan(session.id, banId, 'Undone from board curation');
        await revalidateAffectedBoards(game.id, game.name, [board]);
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to lift the ban.' };
    }
}
