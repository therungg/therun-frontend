/**
 * Twitch OAuth always comes back to one place: `${baseUrl}/api`. That URL is
 * the only one registered with Twitch, and it is the one `createSession` uses
 * for the token exchange — the two must match exactly or Twitch rejects the
 * code. The page to return to afterwards travels in the `state` parameter
 * instead of the redirect URI.
 */
export const OAUTH_CALLBACK_PATH = '/api';

/**
 * `state` comes back from Twitch untrusted, so only same-site absolute paths
 * survive. Anything else (absolute URLs, protocol-relative `//host`, backslash
 * variants) falls back to the homepage.
 */
export const sanitizeReturnTo = (value: string | null | undefined): string => {
    if (!value) return '/';
    if (!value.startsWith('/')) return '/';
    if (value.startsWith('//') || value.startsWith('/\\')) return '/';
    return value;
};

export const getTwitchOAuthURL = ({
    returnTo = '/',
}: {
    returnTo?: string;
}) => {
    const clientId = process.env.NEXT_PUBLIC_TWITCH_OAUTH_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    const twitchAuthURL = 'https://id.twitch.tv/oauth2/authorize';
    const params = new URLSearchParams({
        client_id: clientId || '',
        redirect_uri: baseUrl + OAUTH_CALLBACK_PATH,
        response_type: 'code',
        scope: 'user:read:email+openid',
        claims: JSON.stringify({
            id_token: { picture: null },
            userinfo: { preferred_username: null, picture: null },
        }),
    });

    // `state` is appended after the decode because a return path carries its
    // own `?`, `&` and `=` — decoding those would splice them into the auth
    // URL as real parameters.
    const state = encodeURIComponent(sanitizeReturnTo(returnTo));
    return new URL(
        `${twitchAuthURL}?${decodeURIComponent(params.toString())}&state=${state}`,
    );
};
