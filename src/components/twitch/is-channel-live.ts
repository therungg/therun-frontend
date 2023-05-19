import { clientId } from "./TwitchLoginButton";

export const isChannelLive = (oauthToken: string, channelName: string) => {
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
