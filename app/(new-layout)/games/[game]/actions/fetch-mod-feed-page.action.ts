'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { listAnonymizeRules } from '~src/lib/moderation/anonymize';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listModActions } from '~src/lib/moderation/mass-mgmt';
import {
    buildAnonymizeIndex,
    buildModeratorFeed,
} from '~src/lib/moderation/mod-feed';
import type { PublicModLogPage } from '../../../../../types/moderation.types';

/**
 * The "Moderator view" data source for the board's Moderation tab: the
 * AUTHENTICATED per-game feed, with real identities, adapted into the public
 * feed's shape so the same `LogRow` renders both.
 *
 * Not cached: it is per-viewer, permission-gated, and a mod must read their
 * own writes. Returns `null` on any failure — the view falls back to a
 * retry banner exactly as it does for the public feed.
 *
 * Contract seams this papers over (documented in `mod-feed.ts`):
 *  - the authed feed is a bare array with no `total`, so `total`/`hasMore`
 *    are derived from whether a full page came back;
 *  - it is time-windowed (`days`, backend cap 365) where the public log is
 *    all-history — a moderator view therefore cannot reach further back than
 *    a year.
 */

const MOD_FEED_DAYS = 365;

export async function fetchModFeedPage(q: {
    gameSlug: string;
    limit: number;
    offset: number;
    categoryId?: number;
}): Promise<PublicModLogPage | null> {
    const session = await getSession();
    if (!session?.username || !session.id) return null;

    const game = await resolveGame(q.gameSlug);
    if (!game) return null;
    if (!canModerateGame(session, game.name)) return null;

    const limit = Math.min(100, Math.max(1, Math.floor(q.limit)));
    const offset = Math.max(0, Math.floor(q.offset));

    try {
        const [rows, rules] = await Promise.all([
            listModActions(session.id, game.id, {
                days: MOD_FEED_DAYS,
                limit,
                offset,
                categoryId: q.categoryId,
            }),
            // Which subjects the public sees as a placeholder. Best-effort:
            // losing the badge is far better than losing the whole feed.
            listAnonymizeRules(session.id, game.id, {
                includeGlobal: true,
            }).catch(() => []),
        ]);

        const items = buildModeratorFeed(rows, buildAnonymizeIndex(rules));
        const hasMore = rows.length === limit;
        return {
            items,
            // No count endpoint on the authed feed — this is a floor, not a
            // true total, and the view labels it as such.
            total: offset + items.length + (hasMore ? 1 : 0),
            limit,
            offset,
            hasMore,
        };
    } catch {
        return null;
    }
}
