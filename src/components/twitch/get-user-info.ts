export const getUserInfo = async (oauthToken: string) => {
    return fetch("https://id.twitch.tv/oauth2/userinfo", {
        headers: {
            Authorization: `Bearer ${oauthToken}`,
        },
    });
};
