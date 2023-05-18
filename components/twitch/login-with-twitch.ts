import { clientId } from "./TwitchLoginButton";
import { getUserInfo } from "./get-user-info";

export const clientSecret = process.env.TWITCH_OAUTH_SECRET;

export interface LoginWithTwitchResult {
    loginData: LoginData;
    userInfo: UserInfo;
}

interface LoginData {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

interface UserInfo {
    preferred_username: string;
    picture: string;
}

export const loginWithTwitch = async (
    baseUrl: string,
    code: string
): Promise<LoginWithTwitchResult> => {
    const uri =
        `https://id.twitch.tv/oauth2/token` +
        `?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&grant_type=authorization_code` +
        `&redirect_uri=${baseUrl}`;

    const loginData = await (
        await fetch(uri, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                // eslint-disable-next-line camelcase
                client_id: clientId,
                // eslint-disable-next-line camelcase
                client_secret: clientSecret,
                code,
                // eslint-disable-next-line camelcase
                grant_type: "authorization_code",
                // eslint-disable-next-line camelcase
                redirect_uri: baseUrl,
            }),
        })
    ).json();

    const userInfo = await (await getUserInfo(loginData.access_token)).json();

    return {
        loginData,
        userInfo,
    };
};
