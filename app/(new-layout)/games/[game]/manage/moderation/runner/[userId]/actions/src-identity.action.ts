'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    getRunnerSrcIdentity,
    type RunnerSrcIdentity,
    type SetSrcIdentityResult,
    setRunnerSrcIdentity,
} from '~src/lib/moderation/src-identity';

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

const fail = (e: unknown, fallback: string): Fail => ({
    error: e instanceof ModError ? e.message : fallback,
});

export async function loadRunnerSrcIdentityAction(
    gameSlug: string,
    userId: number,
): Promise<{ identity: RunnerSrcIdentity } | Fail> {
    const mod = await requireMod(gameSlug);
    if ('error' in mod) return mod;
    try {
        return {
            identity: await getRunnerSrcIdentity(
                mod.sessionId,
                mod.gameId,
                userId,
            ),
        };
    } catch (e) {
        return fail(e, 'Could not load the speedrun.com profile.');
    }
}

export async function setRunnerSrcIdentityAction(
    gameSlug: string,
    userId: number,
    srcName: string,
): Promise<{ result: SetSrcIdentityResult } | Fail> {
    const mod = await requireMod(gameSlug);
    if ('error' in mod) return mod;
    const name = srcName.trim();
    if (!name) return { error: 'Enter a speedrun.com name or profile link.' };
    try {
        return {
            result: await setRunnerSrcIdentity(
                mod.sessionId,
                mod.gameId,
                userId,
                name,
            ),
        };
    } catch (e) {
        return fail(e, 'Could not set the speedrun.com profile.');
    }
}
