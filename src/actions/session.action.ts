'use server';

import { cookies } from 'next/headers';
import { cache } from 'react';
import { DEFAULT_SESSION } from '~src/common/constants';
import { SessionError } from '~src/common/session.error';
import { generateSession } from '~src/lib/generate-session';
import { getSessionData } from '~src/lib/get-session-data';
import { User } from '../../types/session.types';
import { loginWithTwitch } from '../components/twitch/login-with-twitch';
import { getBaseUrl } from './base-url.action';

export const createSession = async (code: string) => {
    const baseUrl = await getBaseUrl();
    let sessionId = (await cookies()).get('session_id')?.value ?? undefined;
    if (sessionId === 'undefined') sessionId = undefined;

    if (!code || sessionId) return;

    const { loginData, userInfo } = await loginWithTwitch(
        `${baseUrl}/api`,
        code,
    );

    const twitchSessionId = await generateSession({
        accessToken: loginData.access_token,
        refreshToken: loginData.refresh_token,
        expiresIn: loginData.expires_in,
        data: {
            username: userInfo.preferred_username,
            picture: userInfo.picture,
        },
    });
    if (twitchSessionId) {
        return {
            username: userInfo.preferred_username,
            picture: userInfo.picture,
            id: twitchSessionId,
        };
    }
};

export const getSession = cache(async (): Promise<User> => {
    const sessionId = (await cookies()).get('session_id')?.value;
    if (!sessionId || sessionId === 'undefined') {
        return DEFAULT_SESSION;
    }
    try {
        const session = await getSessionData(sessionId);
        if (session) {
            return { id: sessionId, ...session } as User;
        }
    } catch (error) {
        console.log('ERROR', error);
        // For now we only want to handle _explicit_ failures when retrieving the session.
        if (error instanceof SessionError) {
            return {
                ...DEFAULT_SESSION,
                sessionError: error.toString(),
            };
        }

        return DEFAULT_SESSION;
    }

    return DEFAULT_SESSION;
});
