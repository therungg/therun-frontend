import { getRun } from "~src/lib/get-run";
import { getGameGlobal } from "~src/components/game/get-game";
import { getLiveRunForUser } from "~src/lib/client/live-runs";
import RunDetail from "~app/[username]/[game]/[run]/run";
import { Metadata } from "next";
import buildMetadata, { getUserProfilePhoto } from "~src/utils/metadata";
import { safeDecodeURI } from "~src/utils/uri";

export const revalidate = 60;

interface PageProps {
    params: Promise<{ username: string; game: string; run: string }>;
    searchParams: Promise<{ [_: string]: string }>;
}

export default async function RunPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const params = await props.params;
    if (!params || !params.username || !params.game || !params.run)
        throw new Error("Params not found");

    const username: string = params.username as string;
    const game: string = params.game as string;
    const runName: string = params.run as string;

    const promises = [getRun(username, game, runName), getGameGlobal(game)];

    const [run, globalGameData] = await Promise.all(promises);

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
            tab={searchParams.tab}
        />
    );
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const params = await props.params;
    const username = params.username;

    if (!username) return buildMetadata();

    const gameAndCategory = `${safeDecodeURI(params.game)} - ${safeDecodeURI(
        params.run,
    )}`;

    return buildMetadata({
        title: `${username}: ${gameAndCategory}`,
        description: `${username} runs ${gameAndCategory}. Check out all their attempts, personal best, and more on The Run!`,
        images: await getUserProfilePhoto(username),
    });
}
