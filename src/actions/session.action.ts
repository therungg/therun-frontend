import {
    createNewSession,
    getSession as getExistingSession,
} from "../components/util/session";
import { getBaseUrl } from "./base-url.action";
import { loginWithTwitch } from "../components/twitch/login-with-twitch";
import { cookies } from "next/headers";
import { User } from "../../types/session.types";
import { SessionError } from "~src/common/session.error";
import { DEFAULT_SESSION } from "~src/common/constants";

export const createSession = async (code: string) => {
    const baseUrl = getBaseUrl();
    let sessionId = cookies().get("session_id")?.value ?? undefined;
    if (sessionId === "undefined") sessionId = undefined;

    if (!code || sessionId) return;

    const { loginData, userInfo } = await loginWithTwitch(
        `${baseUrl}/api`,
        code,
    );

    const twitchSessionId = await createNewSession(
        loginData.access_token,
        loginData.refresh_token,
        loginData.expires_in,
        {
            username: userInfo.preferred_username,
            picture: userInfo.picture,
        },
    );

    if (twitchSessionId) {
        return {
            username: userInfo.preferred_username,
            picture: userInfo.picture,
            id: twitchSessionId,
        };
    }
};

export const getSession = async (): Promise<User> => {
    const sessionId = cookies().get("session_id")?.value;
    if (!sessionId || sessionId === "undefined") {
        return DEFAULT_SESSION;
    }
    try {
        const session = await getExistingSession(sessionId);
        if (session) {
            return { id: sessionId, ...session } as User;
        }
    } catch (error) {
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
};
