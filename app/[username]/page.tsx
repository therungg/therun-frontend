import { getUserRuns } from "~src/lib/get-user-runs";
import { getRunmap } from "~app/[username]/runmap.component";
import { getGameGlobal } from "~src/components/game/get-game";
import getGlobalUser from "~src/lib/get-global-user";
import { GlobalGameData } from "~src/pages/[username]/[game]/[run]";
import { getLiveRunForUser } from "~src/lib/live-runs";
import UserProfile from "~app/[username]/user-profile";
import { getSession } from "~src/actions/session.action";
import { getTournamentNameFromSlug } from "~app/tournaments/tournament-list";
import { TournamentPage } from "~app/tournaments/[tournament]/page";

export default async function Page({
    params,
    searchParams,
}: {
    params: { username: string };
    searchParams: { [_: string]: string };
}) {
    if (!params || !params.username) throw new Error("Username not found");

    const username: string = params.username as string;

    const tournament = getTournamentNameFromSlug(username);

    if (tournament) {
        return TournamentPage({
            params: { tournament },
            searchParams,
        });
    }

    const runs = await getUserRuns(username);

    const allRunsRunMap: Map<string, any> = getRunmap(runs);

    const promises = Array.from(allRunsRunMap.keys()).map((game) => {
        game = game.split("#")[0];
        return getGameGlobal(game);
    });

    const allGlobalGameData = await Promise.all(promises);
    const userData = await getGlobalUser(username);

    const hasGameTime = !!runs.find((run) => run.hasGameTime);

    let defaultGameTime = hasGameTime;

    if (defaultGameTime) {
        defaultGameTime = !!runs.find((run) => {
            const thisGlobalGameData = allGlobalGameData.find(
                (value: GlobalGameData) => {
                    return value.display === run.game;
                }
            );

            return (
                run.hasGameTime &&
                !!thisGlobalGameData &&
                !thisGlobalGameData.forceRealTime
            );
        });
    }

    const liveData = await getLiveRunForUser(username);
    const session = await getSession();

    return (
        <UserProfile
            runs={runs}
            username={username}
            hasGameTime={hasGameTime}
            defaultGameTime={defaultGameTime}
            liveData={liveData}
            session={session}
            userData={userData}
            allGlobalGameData={allGlobalGameData}
        />
    );
}
