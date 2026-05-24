'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { revalidateAffectedBoards } from '~src/lib/moderation/revalidate-boards';
import { applyVerdicts, previewVerdicts } from '~src/lib/moderation/verdicts';
import type {
    BulkVerdictResult,
    VerdictAction,
    VerdictPreviewResult,
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

export async function previewVerdictsAction(
    gameSlug: string,
    action: VerdictAction,
    runIds: number[],
): Promise<{ ok: true; preview: VerdictPreviewResult } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        const preview = await previewVerdicts(g.sessionId, g.gameId, {
            action,
            runIds,
        });
        return { ok: true, preview };
    } catch (e) {
        return fail(e);
    }
}

export async function applyVerdictsAction(
    gameSlug: string,
    action: VerdictAction,
    runIds: number[],
    reason: string,
): Promise<{ ok: true; result: BulkVerdictResult } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        const result = await applyVerdicts(g.sessionId, g.gameId, {
            action,
            runIds,
            reason,
        });
        await revalidateAffectedBoards(
            g.gameId,
            g.gameName,
            result.affectedLeaderboards,
        );
        return { ok: true, result };
    } catch (e) {
        return fail(e);
    }
}
