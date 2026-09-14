'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    dismissTrustOffer,
    getTrustState,
    getWorklist,
    getWorklistDigest,
    grantTrust,
    listTrustGrants,
    revokeTrust,
} from '~src/lib/moderation/worklist';
import type {
    TrustGrant,
    TrustState,
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

export async function loadTrustStateAction(
    gameSlug: string,
    userId: number,
): Promise<{ ok: true; trust: TrustState } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        return {
            ok: true,
            trust: await getTrustState(g.sessionId, g.gameId, userId),
        };
    } catch (e) {
        return fail(e, 'Failed to load trust state.');
    }
}

export async function dismissTrustAction(
    gameSlug: string,
    userId: number,
): Promise<{ ok: true } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        await dismissTrustOffer(g.sessionId, g.gameId, userId);
        return { ok: true };
    } catch (e) {
        return fail(e, 'Failed to save that.');
    }
}

export async function grantTrustAction(
    gameSlug: string,
    userId: number,
    categoryId: number | null,
): Promise<{ ok: true; grant: TrustGrant } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        return {
            ok: true,
            grant: await grantTrust(g.sessionId, g.gameId, userId, categoryId),
        };
    } catch (e) {
        return fail(e, 'Failed to trust this runner.');
    }
}

export async function listTrustGrantsAction(
    gameSlug: string,
): Promise<{ ok: true; grants: TrustGrant[] } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        return {
            ok: true,
            grants: await listTrustGrants(g.sessionId, g.gameId),
        };
    } catch (e) {
        return fail(e, 'Failed to load trusted runners.');
    }
}

export async function revokeTrustAction(
    gameSlug: string,
    grantId: number,
): Promise<{ ok: true } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        await revokeTrust(g.sessionId, g.gameId, grantId);
        return { ok: true };
    } catch (e) {
        return fail(e, 'Failed to revoke trust.');
    }
}
