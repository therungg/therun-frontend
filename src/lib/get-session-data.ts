'use server';

import { cacheLife } from 'next/cache';
import { SessionError } from '~src/common/session.error';

export interface UserData {
    username: string;
    createdAt: string;
    user: string;
    picture: string;
    lastLogin: string;
    login: string;
    roles: string[];
    banned: false;
    moderatedGames: string[];
    pronouns: string;
    aka?: string;
    bio?: string;
    country?: string;
    socials: {
        youtube: string;
        twitter: string;
        twitch: string;
        bluesky?: string;
    };
    timezone: string;
    preferences: unknown;
    searchName: string;
}

export const getSessionData = async (sessionId: string) => {
    // Per-user data: in-memory 'use cache' with a short life, NOT
    // 'use cache: remote' — auth data stays out of the shared cache, and one
    // entry per session would have near-zero remote utilization anyway.
    // Absorbs repeat lookups from page views and server actions (e.g. the
    // topbar notification bell), which were hitting the session API on every
    // request.
    'use cache';
    cacheLife({ stale: 30, revalidate: 60, expire: 300 });

    if (!sessionId) {
        return {} as UserData;
    }

    const url = `https://6ob8kz9k4g.execute-api.eu-west-1.amazonaws.com/session?id=${sessionId}&returnUser=true`;

    // Only a definite "this session is invalid" answer is a SessionError --
    // that one sends the user to the reset-session prompt. An outage (network
    // failure, timeout, 5xx) throws a plain Error so the page still renders,
    // logged out for that request, instead of telling every signed-in user to
    // throw away a session that is fine.
    const response = await fetch(url).catch((error) => {
        throw new Error('Session API unreachable', { cause: error });
    });

    if (response.status >= 500) {
        throw new Error(`Session API returned ${response.status}`);
    }

    const result = await response.json().catch(() => null);
    const session = result?.result?.data as UserData | undefined;

    if (!response.ok || !session) {
        throw new SessionError('An error occurred recovering session data');
    }

    return session;
};
