'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { getAllRuns, getAllRunsCounts } from '~src/lib/moderation/all-runs';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import type {
    AllRunsApiQuery,
    AllRunsCounts,
    AllRunsPage,
} from '../../../../../../../../types/all-runs.types';

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

function fail(e: unknown, fallback: string): Fail {
    if (e instanceof ModError) return { error: e.message };
    return { error: fallback };
}

export async function loadAllRunsAction(
    gameSlug: string,
    q: AllRunsApiQuery,
): Promise<{ ok: true; page: AllRunsPage } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        return { ok: true, page: await getAllRuns(g.sessionId, g.gameId, q) };
    } catch (e) {
        return fail(e, 'Failed to load runs.');
    }
}

export async function loadAllRunsCountsAction(
    gameSlug: string,
    q: AllRunsApiQuery,
): Promise<{ ok: true; counts: AllRunsCounts } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        return {
            ok: true,
            counts: await getAllRunsCounts(g.sessionId, g.gameId, q),
        };
    } catch (e) {
        return fail(e, 'Failed to load counts.');
    }
}
