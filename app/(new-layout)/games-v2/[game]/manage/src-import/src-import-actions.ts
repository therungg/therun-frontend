'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    canConfigureGame,
    canModerateGame,
} from '~src/lib/moderation/can-moderate';
import {
    getSrcImportJob,
    type SrcResyncKind,
    startSrcImport,
    startSrcResync,
} from '~src/lib/src-import';
import type {
    SrcImportCommitFlags,
    SrcImportJob,
    SrcImportJobKind,
} from '../../../../../../types/src-import.types';

export type ActionResult<T> = { result: T } | { error: string };

/**
 * The backend owns the real auth chain (therun mod → source identity → source
 * mod). This only keeps non-moderators from reaching the API at all,
 * mirroring the console door: the import pane is held by the same people
 * who can moderate or configure the board.
 */
async function requireBoardMod(gameSlug: string): Promise<string> {
    const session = await getSession();
    if (!session?.id || !session.username) throw new Error('Not signed in');
    if (
        !canModerateGame(session, gameSlug) &&
        !canConfigureGame(session, gameSlug)
    ) {
        throw new Error('You are not a moderator of this game on therun.gg');
    }
    return session.id;
}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
    try {
        return { result: await fn() };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: e instanceof Error ? e.message : 'Request failed' };
    }
}

export async function getSrcImportJobAction(input: {
    gameId: number;
    gameSlug: string;
    kind?: SrcImportJobKind;
}): Promise<ActionResult<SrcImportJob | null>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return getSrcImportJob(sessionId, input.gameId, input.kind);
    });
}

export async function resyncAction(input: {
    gameId: number;
    gameSlug: string;
    kind: SrcResyncKind;
    commitFlags?: SrcImportCommitFlags;
}): Promise<ActionResult<{ jobId: number }>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return startSrcResync(
            sessionId,
            input.gameId,
            input.kind,
            input.commitFlags,
        );
    });
}

export async function startSrcImportAction(input: {
    gameId: number;
    gameSlug: string;
    url: string;
    kind?: SrcResyncKind;
}): Promise<ActionResult<{ jobId: number }>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return startSrcImport(
            sessionId,
            input.gameId,
            input.url.trim(),
            input.kind,
        );
    });
}
