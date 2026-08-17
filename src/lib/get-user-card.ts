'use server';

import { cacheLife, cacheTag } from 'next/cache';
import type { UserCardProfile } from '../../types/user-card.types';

/**
 * The hover card's payload: the Dynamo profile plus the lean `card` stats
 * block. Sits alongside getGlobalUser rather than replacing it — the plain
 * profile path is hit once per featured patron on the frontpage and stays free
 * of the extra Postgres lookups.
 */
export const getUserCard = async (
    user: string,
): Promise<UserCardProfile | null> => {
    'use cache: remote';
    cacheLife('hours');
    cacheTag(`user-card-${user.toLowerCase()}`);

    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/users/global/${encodeURIComponent(user)}?card=1`;

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
