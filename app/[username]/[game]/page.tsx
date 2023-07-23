import { getRunByCustomUrl } from "~src/lib/get-run";
import { getGameGlobal } from "~src/components/game/get-game";
import { getLiveRunForUser } from "~src/lib/live-runs";
import RunDetail from "~app/[username]/[game]/[run]/run";
import { Metadata } from "next";
import { getBaseUrl } from "~src/actions/base-url.action";
import buildMetadata from "~src/utils/metadata";
import { safeDecodeURI } from "~src/utils/uri";

export const revalidate = 60;

interface PageProps {
    params: { username: string; game: string };
}

export default async function CustomRunPage({ params }: PageProps) {
    const username: string = params.username as string;
    const customUrl: string = params.game as string;

    const run = await getRunByCustomUrl(username, customUrl);
    const game = run.game;
    const runName = run.run;

    const globalGameData = await getGameGlobal(run.game);

    if (!run) throw new Error("Could not find run");

    const liveData = await getLiveRunForUser(username);

    return (
        <RunDetail
            run={run}
            username={username}
            game={game}
            runName={runName}
            globalGameData={globalGameData}
            liveData={liveData}
        />
    );
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    let imageUrl = undefined;
    const baseUrl = getBaseUrl();
    const username = params.username;

    if (!username) return buildMetadata();

    let response: Response;
    try {
        response = await fetch(`${baseUrl}/api/users/${username}/global`);
    } catch (e) {
        return buildMetadata();
    }

    const data = await response.json();

    if (data?.picture) {
        imageUrl = data.picture;
    }

    return buildMetadata({
        title: username,
        description: `${username} runs ${safeDecodeURI(
            params.game
        )}. Check out all their attempts, personal best, and more on The Run!`,
        images: imageUrl
            ? [
                  {
                      url: imageUrl,
                      secureUrl: imageUrl,
                      alt: `Profile photo of ${username}`,
                      type: "image/png",
                      width: 300,
                      height: 300,
                  },
              ]
            : undefined,
    });
}
