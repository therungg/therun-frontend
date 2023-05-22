import { TwitchLoginButton } from "./TwitchLoginButton";
import { getTwitchOAuthURL } from "./twitch-oauth";

export const TwitchLoginServer = ({ redirect = "" }: { redirect: string }) => {
    const url = getTwitchOAuthURL({ redirect });

    return <TwitchLoginButton url={url.href} />;
};
