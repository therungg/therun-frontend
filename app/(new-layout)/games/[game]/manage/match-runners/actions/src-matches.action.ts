'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    getSrcMatches,
    linkSrcMatches,
    SRC_MATCH_BATCH,
} from '~src/lib/moderation/src-matches';
import type {
    SrcMatchLink,
    SrcMatchLinkResult,
    SrcMatchList,
} from '../../../../../../../types/src-matches.types';

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

export async function loadSrcMatchesAction(
    gameSlug: string,
): Promise<{ list: SrcMatchList } | Fail> {
    const mod = await requireMod(gameSlug);
    if ('error' in mod) return mod;
    try {
        return { list: await getSrcMatches(mod.sessionId, mod.gameId) };
    } catch (e) {
        return fail(e, 'Could not load runners.');
    }
}

export async function linkSrcMatchesAction(
    gameSlug: string,
    links: SrcMatchLink[],
): Promise<{ results: SrcMatchLinkResult[] } | Fail> {
    const mod = await requireMod(gameSlug);
    if ('error' in mod) return mod;
    if (links.length === 0 || links.length > SRC_MATCH_BATCH) {
        return { error: `Link 1 to ${SRC_MATCH_BATCH} runners at a time.` };
    }
    try {
        return await linkSrcMatches(mod.sessionId, mod.gameId, links);
    } catch (e) {
        return fail(e, 'Could not link runners.');
    }
}
