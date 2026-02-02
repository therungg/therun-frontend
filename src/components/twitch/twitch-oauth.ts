export const getTwitchOAuthURL = ({ redirect = '' }) => {
    const clientId = process.env.NEXT_PUBLIC_TWITCH_OAUTH_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    const twitchAuthURL = 'https://id.twitch.tv/oauth2/authorize';
    const params = new URLSearchParams({
        client_id: clientId || '',
        redirect_uri: baseUrl + redirect,
        response_type: 'code',
        scope: 'user:read:email+openid',
        claims: JSON.stringify({
            id_token: { picture: null },
            userinfo: { preferred_username: null, picture: null },
        }),
    });
    return new URL(`${twitchAuthURL}?${decodeURIComponent(params.toString())}`);
};
