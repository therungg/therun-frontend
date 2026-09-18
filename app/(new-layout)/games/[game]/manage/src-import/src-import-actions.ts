'use server';

import { updateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    canConfigureGame,
    canModerateGame,
} from '~src/lib/moderation/can-moderate';
import {
    getSrcImportJob,
    getSrcPurgeJob,
    getSrcPurgePreview,
    listSrcGameCandidates,
    type SrcResyncKind,
    startSrcImport,
    startSrcPurge,
    startSrcResync,
    unblockSrcPurge,
} from '~src/lib/src-import';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type {
    SrcGameCandidate,
    SrcImportCommitFlags,
    SrcImportJob,
    SrcImportJobKind,
    SrcPurgeJob,
    SrcPurgePreview,
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

/** The purge is site-admin only; the backend enforces the same gate. */
async function requireSiteAdmin(): Promise<string> {
    const session = await getSession();
    if (!session?.id || !session.username) throw new Error('Not signed in');
    confirmPermission(session, 'moderate', 'admins');
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

export async function getSrcGameCandidatesAction(input: {
    gameId: number;
    gameSlug: string;
}): Promise<ActionResult<SrcGameCandidate[]>> {
    return run(async () => {
        const sessionId = await requireBoardMod(input.gameSlug);
        return listSrcGameCandidates(sessionId, input.gameId);
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

/**
 * Drops the cached game metadata so the next render reads the theme the import
 * just wrote. `updateTag`, not `revalidateTag`: the caller refreshes straight
 * after and has to see the new value, not the stale one a background
 * revalidation would still be serving.
 */
export async function refreshGameThemeAction(input: {
    gameId: number;
    gameSlug: string;
}): Promise<ActionResult<null>> {
    return run(async () => {
        await requireBoardMod(input.gameSlug);
        updateTag(`game-meta:${input.gameId}`);
        return null;
    });
}

// ---------------------------------------------------------------------------
// Removing a board's speedrun.com data — site-admin only, no board-mod
// fallback. The console only offers these when `isAdmin`, but the gate here
// is what actually stops a non-admin from reaching the API.
// ---------------------------------------------------------------------------

export async function getPurgePreviewAction(input: {
    gameId: number;
}): Promise<ActionResult<SrcPurgePreview>> {
    return run(async () => {
        const sessionId = await requireSiteAdmin();
        return getSrcPurgePreview(sessionId, input.gameId);
    });
}

export async function getPurgeJobAction(input: {
    gameId: number;
}): Promise<ActionResult<SrcPurgeJob | null>> {
    return run(async () => {
        const sessionId = await requireSiteAdmin();
        return getSrcPurgeJob(sessionId, input.gameId);
    });
}

export async function startPurgeAction(input: {
    gameId: number;
    confirmName: string;
}): Promise<ActionResult<{ purgeJobId: number }>> {
    return run(async () => {
        const sessionId = await requireSiteAdmin();
        return startSrcPurge(sessionId, input.gameId, input.confirmName);
    });
}

export async function unblockPurgeAction(input: {
    gameId: number;
}): Promise<ActionResult<{ unblocked: boolean }>> {
    return run(async () => {
        const sessionId = await requireSiteAdmin();
        return unblockSrcPurge(sessionId, input.gameId);
    });
}
