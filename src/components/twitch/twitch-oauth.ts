export const getTwitchOAuthURL = ({ redirect = "" }) => {
    const clientId = process.env.TWITCH_OAUTH_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    const twitchAuthURL = "https://id.twitch.tv/oauth2/authorize";
    const params = new URLSearchParams({
        // eslint-disable-next-line camelcase
        client_id: clientId || "",
        // eslint-disable-next-line camelcase
        redirect_uri: baseUrl + redirect,
        // eslint-disable-next-line camelcase
        response_type: "code",
        scope: "user:read:email+openid",
        claims: JSON.stringify({
            // eslint-disable-next-line camelcase
            id_token: { picture: null },
            // eslint-disable-next-line camelcase
            userinfo: { preferred_username: null, picture: null },
        }),
    });
    return new URL(`${twitchAuthURL}?${decodeURIComponent(params.toString())}`);
};
