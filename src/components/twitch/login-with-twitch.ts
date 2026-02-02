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

const getUserInfo = async (oauthToken: string) => {
    return fetch('https://id.twitch.tv/oauth2/userinfo', {
        headers: {
            Authorization: `Bearer ${oauthToken}`,
        },
    });
};

export const loginWithTwitch = async (
    baseUrl: string,
    code: string,
): Promise<LoginWithTwitchResult> => {
    const clientId = process.env.NEXT_PUBLIC_TWITCH_OAUTH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_OAUTH_SECRET;
    const uri =
        `https://id.twitch.tv/oauth2/token` +
        `?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&grant_type=authorization_code` +
        `&redirect_uri=${baseUrl}`;

    const loginData = await (
        await fetch(uri, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                grant_type: 'authorization_code',
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
