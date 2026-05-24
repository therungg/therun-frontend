'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { exclude } from '~src/lib/moderation/mass-mgmt';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { revalidateAffectedBoards } from '~src/lib/moderation/revalidate-boards';
import { applyVerdicts } from '~src/lib/moderation/verdicts';

type Result = { ok: true } | { error: string };

async function gate(
    gameSlug: string,
): Promise<
    { sessionId: string; gameId: number; gameName: string } | { error: string }
> {
    const s = await getSession();
    if (!s?.username || !s.id) return { error: 'Not signed in.' };
    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(s, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }
    return { sessionId: s.id, gameId: game.id, gameName: game.name };
}

function fail(e: unknown): { error: string } {
    if (e instanceof ModError) return { error: e.message };
    return { error: 'Something went wrong. Please try again.' };
}

/** Verify or reject a single run inline from the leaderboard (mod). */
export async function boardRunVerdictAction(
    gameSlug: string,
    runId: number,
    action: 'verify' | 'reject',
    reason: string,
): Promise<Result> {
    const g = await gate(gameSlug);
    if ('error' in g) return g;
    try {
        const r = await applyVerdicts(g.sessionId, g.gameId, {
            action,
            runIds: [runId],
            reason,
        });
        await revalidateAffectedBoards(
            g.gameId,
            g.gameName,
            r.affectedLeaderboards,
        );
        return { ok: true };
    } catch (e) {
        return fail(e);
    }
}

/** Exclude a single run inline from the leaderboard (mod, ad-hoc). */
export async function boardExcludeRunAction(
    gameSlug: string,
    runId: number,
    reason: string,
): Promise<Result> {
    const g = await gate(gameSlug);
    if ('error' in g) return g;
    try {
        const r = await exclude(g.sessionId, g.gameId, {
            runIds: [runId],
            reason,
        });
        if ('affectedLeaderboards' in r) {
            await revalidateAffectedBoards(
                g.gameId,
                g.gameName,
                r.affectedLeaderboards,
            );
        }
        return { ok: true };
    } catch (e) {
        return fail(e);
    }
}
