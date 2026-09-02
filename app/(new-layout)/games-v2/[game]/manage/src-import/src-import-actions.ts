'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    canConfigureGame,
    canModerateGame,
} from '~src/lib/moderation/can-moderate';
import {
    applySrcImportConfig,
    getSrcImportJob,
    getSrcImportPlan,
    importSrcRuns,
    listSrcImportCategories,
    listSrcImportLevels,
    listSrcImportPlayers,
    listSrcImportRuns,
    listSrcImportVariables,
    reconcileSrcImport,
    reconcileUndoSrcImport,
    type SrcImportPlayersQuery,
    type SrcImportRunsQuery,
    setSrcImportFlags,
    setSrcImportOverrides,
    setSrcOnlyLeaderboard,
    startSrcImport,
    startSrcResync,
    undoSrcImportConfig,
    undoSrcImportRuns,
} from '~src/lib/src-import';
import type {
    Paged,
    SrcCommitOverrides,
    SrcCommitPlan,
    SrcImportCategory,
    SrcImportCommitFlags,
    SrcImportJob,
    SrcImportLevel,
    SrcImportPlayer,
    SrcImportRun,
    SrcImportVariable,
} from '../../../../../../types/src-import.types';

export type ActionResult<T> = { result: T } | { error: string };

/**
 * Kill switch: the board import is pulled from the console for now (nav item
 * hidden, `showImport` false everywhere it gates board-overview). This blocks
 * the server actions too, so a direct call can't reach it once the door is
 * gone. Flip back to `false` to restore — nothing else needs to change.
 */
const IMPORT_DISABLED = true;

/**
 * The backend owns the real four-step auth chain (therun mod → SRC identity →
 * SRC mod). This only keeps non-moderators from reaching the API at all,
 * mirroring the console door: `import-board` is held by the same people who
 * can moderate or configure the board.
 */
async function requireBoardMod(gameSlug: string): Promise<string> {
    if (IMPORT_DISABLED) throw new Error('Import is temporarily disabled.');
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

export async function getSrcImportPlanAction(input: {
    gameId: number;
    gameSlug: string;
    jobId: number;
}): Promise<ActionResult<SrcCommitPlan>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return getSrcImportPlan(sessionId, input.gameId, input.jobId);
    });
}

export async function setSrcImportOverridesAction(input: {
    gameId: number;
    gameSlug: string;
    jobId: number;
    overrides: SrcCommitOverrides;
}): Promise<ActionResult<SrcCommitPlan>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return setSrcImportOverrides(
            sessionId,
            input.gameId,
            input.jobId,
            input.overrides,
        );
    });
}

export async function applyConfigAction(input: {
    gameId: number;
    gameSlug: string;
    jobId: number;
}): Promise<ActionResult<{ jobId: number }>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return applySrcImportConfig(sessionId, input.gameId, input.jobId);
    });
}

export async function importRunsAction(input: {
    gameId: number;
    gameSlug: string;
    jobId: number;
}): Promise<ActionResult<{ jobId: number }>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return importSrcRuns(sessionId, input.gameId, input.jobId);
    });
}

/**
 * One-click re-sync (auto-applied, throttled once/day/game server-side). No URL
 * — the backend derives it from the game's mappings. A 429 rejection surfaces
 * as an ActionResult error. See docs/plans/2026-08-29-src-resync-design.md.
 */
export async function resyncAction(input: {
    gameId: number;
    gameSlug: string;
}): Promise<ActionResult<{ jobId: number }>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return startSrcResync(sessionId, input.gameId);
    });
}

export async function undoRunsAction(input: {
    gameId: number;
    gameSlug: string;
    jobId: number;
}): Promise<ActionResult<{ jobId: number }>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return undoSrcImportRuns(sessionId, input.gameId, input.jobId);
    });
}

export async function undoConfigAction(input: {
    gameId: number;
    gameSlug: string;
    jobId: number;
}): Promise<ActionResult<{ jobId: number }>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return undoSrcImportConfig(sessionId, input.gameId, input.jobId);
    });
}

export async function reconcileAction(input: {
    gameId: number;
    gameSlug: string;
    jobId: number;
}): Promise<ActionResult<{ jobId: number }>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return reconcileSrcImport(sessionId, input.gameId, input.jobId);
    });
}

export async function reconcileUndoAction(input: {
    gameId: number;
    gameSlug: string;
    jobId: number;
}): Promise<ActionResult<{ jobId: number }>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return reconcileUndoSrcImport(sessionId, input.gameId, input.jobId);
    });
}

export async function setSrcOnlyAction(input: {
    gameId: number;
    gameSlug: string;
    jobId: number;
    enabled: boolean;
}): Promise<ActionResult<{ jobId: number; srcOnlyLeaderboard: boolean }>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return setSrcOnlyLeaderboard(
            sessionId,
            input.gameId,
            input.jobId,
            input.enabled,
        );
    });
}

export async function setFlagsAction(input: {
    gameId: number;
    gameSlug: string;
    jobId: number;
    flags: SrcImportCommitFlags;
}): Promise<ActionResult<SrcImportCommitFlags>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return setSrcImportFlags(
            sessionId,
            input.gameId,
            input.jobId,
            input.flags,
        );
    });
}
