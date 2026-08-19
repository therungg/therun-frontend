'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    canConfigureGame,
    canModerateGame,
} from '~src/lib/moderation/can-moderate';
import {
    getSrcImportJob,
    listSrcImportCategories,
    listSrcImportLevels,
    listSrcImportPlayers,
    listSrcImportRuns,
    listSrcImportVariables,
    type SrcImportPlayersQuery,
    type SrcImportRunsQuery,
    startSrcImport,
} from '~src/lib/src-import';
import type {
    Paged,
    SrcImportCategory,
    SrcImportJob,
    SrcImportLevel,
    SrcImportPlayer,
    SrcImportRun,
    SrcImportVariable,
} from '../../../../../../types/src-import.types';

export type ActionResult<T> = { result: T } | { error: string };

/**
 * The backend owns the real four-step auth chain (therun mod → SRC identity →
 * SRC mod). This only keeps non-moderators from reaching the API at all,
 * mirroring the console door: `import-board` is held by the same people who
 * can moderate or configure the board.
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

export async function startSrcImportAction(input: {
    gameId: number;
    gameSlug: string;
    url: string;
}): Promise<ActionResult<{ jobId: number }>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return startSrcImport(sessionId, input.gameId, input.url.trim());
    });
}

export async function getSrcImportJobAction(input: {
    gameId: number;
    gameSlug: string;
}): Promise<ActionResult<SrcImportJob | null>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return getSrcImportJob(sessionId, input.gameId);
    });
}

export async function listSrcImportCategoriesAction(input: {
    gameId: number;
    gameSlug: string;
    jobId: number;
}): Promise<ActionResult<SrcImportCategory[]>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return listSrcImportCategories(sessionId, input.gameId, input.jobId);
    });
}

export async function listSrcImportLevelsAction(input: {
    gameId: number;
    gameSlug: string;
    jobId: number;
}): Promise<ActionResult<SrcImportLevel[]>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return listSrcImportLevels(sessionId, input.gameId, input.jobId);
    });
}

export async function listSrcImportVariablesAction(input: {
    gameId: number;
    gameSlug: string;
    jobId: number;
}): Promise<ActionResult<SrcImportVariable[]>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return listSrcImportVariables(sessionId, input.gameId, input.jobId);
    });
}

export async function listSrcImportPlayersAction(input: {
    gameId: number;
    gameSlug: string;
    jobId: number;
    query?: SrcImportPlayersQuery;
}): Promise<ActionResult<Paged<SrcImportPlayer>>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return listSrcImportPlayers(
            sessionId,
            input.gameId,
            input.jobId,
            input.query,
        );
    });
}

export async function listSrcImportRunsAction(input: {
    gameId: number;
    gameSlug: string;
    jobId: number;
    query?: SrcImportRunsQuery;
}): Promise<ActionResult<Paged<SrcImportRun>>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return listSrcImportRuns(
            sessionId,
            input.gameId,
            input.jobId,
            input.query,
        );
    });
}
