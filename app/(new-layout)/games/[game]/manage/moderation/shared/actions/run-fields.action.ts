'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    revalidateAffectedBoards,
    revalidateRunDetails,
} from '~src/lib/moderation/revalidate-boards';
import { type EditRunInput, editRun } from '~src/lib/moderation/run-edit';
import type { AffectedLeaderboard } from '../../../../../../../../types/moderation.types';

type Result = { ok: true } | { error: string };

async function editAsMod(
    gameSlug: string,
    runId: number,
    input: EditRunInput,
    /** Null when the edit changes nothing any board shows. */
    board: AffectedLeaderboard | null,
    fallback: string,
): Promise<Result> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        await editRun(session.id, runId, input);
        if (board) await revalidateAffectedBoards(game.id, game.name, [board]);
        revalidateRunDetails([runId]);
        return { ok: true };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: fallback };
    }
}

/**
 * Replace a run's variables. The backend re-derives the subcategory key from
 * the whole map, so callers send every variable the run has, not only the one
 * that changed.
 */
export async function setRunVariablesAction(
    gameSlug: string,
    runId: number,
    variables: Record<string, string>,
    reason: string,
    board: AffectedLeaderboard,
): Promise<Result> {
    return editAsMod(
        gameSlug,
        runId,
        { variables, reason },
        board,
        'Could not change the run.',
    );
}

/** The moderators' own note on a run. Only moderators ever see it. */
export async function setModNoteAction(
    gameSlug: string,
    runId: number,
    note: string,
): Promise<Result> {
    return editAsMod(
        gameSlug,
        runId,
        { modNote: note, reason: 'Moderator note updated' },
        null,
        'Could not save the note.',
    );
}
