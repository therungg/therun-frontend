'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import {
    createManualTime,
    deleteManualTime,
    listManualTimes,
    manualTimeVerdict,
    previewManualTime,
    updateManualTime,
} from '~src/lib/moderation/manual-times';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    revalidateAffectedBoards,
    revalidateRunDetails,
} from '~src/lib/moderation/revalidate-boards';
import type {
    CreateManualTimeResult,
    ManualTimeFilter,
    ManualTimePreviewInput,
    ManualTimePreviewResult,
    ManualTimeRow,
    ModTiming,
    RunnerRef,
} from '../../../../../../../../types/moderation.types';

type Fail = { error: string };

async function requireMod(
    gameSlug: string,
): Promise<{ sessionId: string; gameId: number; gameName: string } | Fail> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };
    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }
    return { sessionId: session.id, gameId: game.id, gameName: game.name };
}

function fail(e: unknown): Fail {
    if (e instanceof ModError) return { error: e.message };
    return { error: 'Something went wrong. Please try again.' };
}

export async function listManualTimesAction(
    gameSlug: string,
    filter?: ManualTimeFilter,
): Promise<{ ok: true; rows: ManualTimeRow[] } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        const rows = await listManualTimes(g.sessionId, g.gameId, filter);
        return { ok: true, rows };
    } catch (e) {
        return fail(e);
    }
}

export async function previewManualTimeAction(
    gameSlug: string,
    input: ManualTimePreviewInput,
): Promise<{ ok: true; preview: ManualTimePreviewResult } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        const preview = await previewManualTime(g.sessionId, g.gameId, input);
        return { ok: true, preview };
    } catch (e) {
        return fail(e);
    }
}

export async function createManualTimeAction(
    gameSlug: string,
    input: {
        runnerRef: RunnerRef;
        categoryId: number;
        subcategoryKey: string;
        timing: ModTiming;
        timeMs: number;
        evidenceUrl?: string | null;
        reason: string;
    },
): Promise<{ ok: true; result: CreateManualTimeResult } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        const result = await createManualTime(g.sessionId, g.gameId, input);
        await revalidateAffectedBoards(
            g.gameId,
            g.gameName,
            result.affectedLeaderboards,
        );
        revalidateRunDetails([], [result.id]);
        return { ok: true, result };
    } catch (e) {
        return fail(e);
    }
}

export async function updateManualTimeAction(
    gameSlug: string,
    id: number,
    input: { reason: string; timeMs?: number; evidenceUrl?: string | null },
): Promise<{ ok: true } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        await updateManualTime(g.sessionId, g.gameId, id, input);
        revalidateRunDetails([], [id]);
        return { ok: true };
    } catch (e) {
        return fail(e);
    }
}

export async function deleteManualTimeAction(
    gameSlug: string,
    id: number,
    reason: string,
): Promise<{ ok: true } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        const result = await deleteManualTime(
            g.sessionId,
            g.gameId,
            id,
            reason,
        );
        await revalidateAffectedBoards(
            g.gameId,
            g.gameName,
            result.affectedLeaderboards,
        );
        revalidateRunDetails([], [id]);
        return { ok: true };
    } catch (e) {
        return fail(e);
    }
}

export async function manualTimeVerdictAction(
    gameSlug: string,
    id: number,
    action: 'verify' | 'reject',
    reason: string,
): Promise<{ ok: true; verificationStatus: 'verified' | 'rejected' } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        const r = await manualTimeVerdict(g.sessionId, g.gameId, id, {
            action,
            reason,
        });
        revalidateRunDetails([], [id]);
        return { ok: true, verificationStatus: r.verificationStatus };
    } catch (e) {
        return fail(e);
    }
}
