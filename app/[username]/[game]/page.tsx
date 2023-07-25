import { getRunByCustomUrl } from "~src/lib/get-run";
import { getGameGlobal } from "~src/components/game/get-game";
import { getLiveRunForUser } from "~src/lib/live-runs";
import RunDetail from "~app/[username]/[game]/[run]/run";
import { Metadata } from "next";
import buildMetadata, { getUserProfilePhoto } from "~src/utils/metadata";

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
    const username: string = params.username as string;
    const customUrl: string = params.game as string;

    if (!username || !customUrl) return buildMetadata();

    const run = await getRunByCustomUrl(username, customUrl);
    const game = run.game;
    const runName = run.run;

    const gameAndCategory = `${game} - ${runName}`;

    return buildMetadata({
        title: username,
        description: `${username} runs ${gameAndCategory}. Check out all their attempts, personal best, and more on The Run!`,
        images: await getUserProfilePhoto(username),
    });
}
