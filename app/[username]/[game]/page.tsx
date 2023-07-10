import { getRunByCustomUrl } from "~src/lib/get-run";
import { getGameGlobal } from "~src/components/game/get-game";
import { getLiveRunForUser } from "~src/lib/live-runs";
import RunDetail from "~app/[username]/[game]/[run]/run";

export default async function CustomRunPage({
    params,
}: {
    params: { username: string; game: string };
}) {
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
