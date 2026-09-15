'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    getWorklist,
    getWorklistDigest,
    nudgeRuns,
    requestVideo,
    waiveVideo,
} from '~src/lib/moderation/worklist';
import type {
    WorklistDigest,
    WorklistFilter,
    WorklistPage,
} from '../../../../../../../../types/worklist.types';

type Fail = { error: string };

async function requireMod(
    gameSlug: string,
): Promise<{ sessionId: string; gameId: number } | Fail> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };
    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }
    return { sessionId: session.id, gameId: game.id };
}

function fail(e: unknown, fallback: string): Fail {
    if (e instanceof ModError) return { error: e.message };
    return { error: fallback };
}

export async function loadWorklistAction(
    gameSlug: string,
    filter: WorklistFilter,
): Promise<{ ok: true; page: WorklistPage } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        return {
            ok: true,
            page: await getWorklist(g.sessionId, g.gameId, filter),
        };
    } catch (e) {
        return fail(e, 'Failed to load the worklist.');
    }
}

export async function loadDigestAction(
    gameSlug: string,
    days: number,
): Promise<{ ok: true; digest: WorklistDigest } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        return {
            ok: true,
            digest: await getWorklistDigest(g.sessionId, g.gameId, days),
        };
    } catch (e) {
        return fail(e, 'Failed to load the digest.');
    }
}

export async function requestVideoAction(
    gameSlug: string,
    runIds: number[],
): Promise<{ ok: true; count: number } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        return {
            ok: true,
            count: (await requestVideo(g.sessionId, g.gameId, runIds))
                .requested,
        };
    } catch (e) {
        return fail(e, 'Failed to ask for a video.');
    }
}

export async function nudgeRunsAction(
    gameSlug: string,
    runIds: number[],
): Promise<{ ok: true; count: number } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        return {
            ok: true,
            count: (await nudgeRuns(g.sessionId, g.gameId, runIds)).nudged,
        };
    } catch (e) {
        return fail(e, 'Failed to remind the runner.');
    }
}

export async function waiveVideoAction(
    gameSlug: string,
    runIds: number[],
): Promise<{ ok: true; count: number } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        return {
            ok: true,
            count: (await waiveVideo(g.sessionId, g.gameId, runIds)).waived,
        };
    } catch (e) {
        return fail(e, 'Failed to accept without a video.');
    }
}
