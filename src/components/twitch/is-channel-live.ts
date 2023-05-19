export const isChannelLive = (oauthToken: string, channelName: string) => {
    const clientId = process.env.TWITCH_OAUTH_CLIENT_ID;
    return fetch(
        `https://api.twitch.tv/helix/streams?user_login=${channelName}`,
        {
            headers: {
                Authorization: `Bearer ${oauthToken}`,
                "Client-Id": clientId,
            },
        }
    );
};
