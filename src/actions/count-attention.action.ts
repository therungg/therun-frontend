'use server';

import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { resolveModSummary } from '~src/lib/moderation/mod-summary';
import { getSession } from './session.action';

export interface AttentionCount {
    count: number;
    degraded: boolean;
}

/**
 * Live poll for the console's "needs attention" badge (see
 * console-shell.tsx) — deliberately NOT `'use cache'`-wrapped, unlike
 * `getCachedModSummary`. The console polls this every 90s to notice new
 * flags/reports/self-claims without a manual reload; a cached result would
 * defeat that entirely.
 */
export async function countAttentionAction(
    gameSlug: string,
): Promise<AttentionCount> {
    const session = await getSession();
    if (!session?.id || !session.username) {
        return { count: 0, degraded: false };
    }

    const game = await resolveGame(gameSlug);
    if (!game || !canModerateGame(session, game.name)) {
        return { count: 0, degraded: false };
    }

    return resolveModSummary(session.id, game.id);
}
