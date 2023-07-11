import { getRun } from "~src/lib/get-run";
import { getGameGlobal } from "~src/components/game/get-game";
import { getLiveRunForUser } from "~src/lib/live-runs";
import RunDetail from "~app/[username]/[game]/[run]/run";

export const revalidate = 60;

export default async function RunPage({
    params,
    searchParams,
}: {
    params: { username: string; game: string; run: string };
    searchParams: { [_: string]: string };
}) {
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
