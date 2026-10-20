'use server';

import { cacheLife, cacheTag } from 'next/cache';
import { dataUrl } from '~src/lib/data-url';
import type { UserCardProfile } from '../../types/user-card.types';

/**
 * The hover card's payload: the Dynamo profile plus the lean `card` stats
 * block. Sits alongside getGlobalUser rather than replacing it — the plain
 * profile path is hit once per featured patron on the frontpage and stays free
 * of the extra Postgres lookups.
 *
 * With a game the card also carries that game's block. The arguments are part
 * of the cache key, so each user/game pair is its own entry; the plain user
 * tag still clears all of them at once.
 */
export const getUserCard = async (
    user: string,
    game?: string | null,
): Promise<UserCardProfile | null> => {
    'use cache';
    cacheLife('hours');
    const tag = `user-card-${user.toLowerCase()}`;
    if (game) cacheTag(tag, `${tag}-${game.toLowerCase()}`);
    else cacheTag(tag);

    let url = dataUrl(`/users/global/${encodeURIComponent(user)}?card=1`);
    if (game) url += `&game=${encodeURIComponent(game)}`;

    try {
        const res = await fetch(url);
        // A banned or globally anonymized runner answers 404 here. That is a
        // real answer, not an error: the card renders nothing.
        if (!res.ok) return null;

        const json = await res.json();
        const profile = json?.result as UserCardProfile | null;

        return profile?.card ? profile : null;
    } catch {
        return null;
    }
};
