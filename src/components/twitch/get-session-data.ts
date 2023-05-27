import { createNewSession, getSession } from "../util/session";
import { loginWithTwitch } from "./login-with-twitch";
import { setCookies } from "cookies-next";
import { NextPageContext } from "next";

export const getSessionData = async (
    context: NextPageContext,
    baseUrl: string
) => {
    const { req, res } = context;
    const { cookies } = req ? req : { cookies: undefined };
    const code = context.query ? (context.query["code"] as string) : null;

    let data = {};

    if (code) {
        const { loginData, userInfo } = await loginWithTwitch(baseUrl, code);
        const sessionId = await createNewSession(
            loginData.access_token,
            loginData.refresh_token,
            loginData.expires_in,
            {
                username: userInfo.preferred_username,
                picture: userInfo.picture,
            }
        );
        if (sessionId) {
            setCookies("session_id", sessionId, {
                req,
                res,
                maxAge: 30 * 60 * 60 * 24,
            });
            data = {
                username: userInfo.preferred_username,
                picture: userInfo.picture,
                id: sessionId,
            };
        }
    }
    if (cookies && cookies.session_id) {
        const session = await getSession(cookies.session_id);
        data = {
            ...session,
            id: cookies.session_id,
        };
    }

    return data;
};
