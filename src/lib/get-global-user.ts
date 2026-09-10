'use server';

import { cacheLife, cacheTag } from 'next/cache';
import { type UserData } from './get-session-data';

export const getGlobalUser = async (user: string) => {
    'use cache: remote';
    cacheLife('hours');
    // Normalised: the profile route passes the URL segment straight through,
    // so /Joey and /joey are the same person but would otherwise carry
    // different tags — and an invalidation that clears one leaves the other
    // serving a deleted account for the rest of the hour.
    cacheTag(`user-${user.toLowerCase()}`);
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/users/global/${user}`;

    const res = await fetch(url);
    // The API answers a missing, banned or anonymised account with a plain-text
    // body, not JSON. Parsing it threw a SyntaxError that took the whole
    // profile page down with it ("Unexpected token 'U', "User not found"").
    if (!res.ok) return null;

    const json = await res.json().catch(() => null);

    return (json?.result ?? null) as UserData | null;
};
