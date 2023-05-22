import {
    createNewSession,
    getSession as getExistingSession,
} from "../components/util/session";
import { getBaseUrl } from "./base-url.action";
import { loginWithTwitch } from "../components/twitch/login-with-twitch";
import { cookies } from "next/headers";

export const createSession = async (code: string) => {
    const baseUrl = getBaseUrl();
    const sessionId = cookies().get("session_id")?.value ?? "";

    if (!code || sessionId) return;

    const { loginData, userInfo } = await loginWithTwitch(
        `${baseUrl}/api`,
        code
    );

    const twitchSessionId = await createNewSession(
        loginData.access_token,
        loginData.refresh_token,
        loginData.expires_in,
        {
            username: userInfo.preferred_username,
            picture: userInfo.picture,
        }
    );

    if (twitchSessionId) {
        return {
            username: userInfo.preferred_username,
            picture: userInfo.picture,
            id: twitchSessionId,
        };
    }
};

export const getSession = async () => {
    const sessionId = cookies().get("session_id")?.value ?? "";
    const session = await getExistingSession(sessionId);

    if (session) {
        return { id: sessionId, ...session };
    }

    return {};
};
