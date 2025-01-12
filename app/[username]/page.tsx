import { getUserRuns } from "~src/lib/get-user-runs";
import { getRunmap } from "~app/[username]/runmap.component";
import { getGameGlobal } from "~src/components/game/get-game";
import getGlobalUser from "~src/lib/get-global-user";
import { GlobalGameData } from "~app/[username]/[game]/[run]/run";
import { getLiveRunForUser } from "~src/lib/live-runs";
import UserProfile from "~app/[username]/user-profile";
import { getSession } from "~src/actions/session.action";
import {
    getAllTournamentSlugs,
    getTournamentNameFromSlug,
} from "~app/tournaments/tournament-list";
import { TournamentPage } from "~app/tournaments/[tournament]/page";
import { Metadata } from "next";
import buildMetadata, { getUserProfilePhoto } from "~src/utils/metadata";
import { CombinedTournamentPage } from "~app/tournaments/[tournament]/combined-tournament-page";
import { getUserRaceStats } from "~src/lib/races";
import { getImportantRace } from "~app/important-race-list";
import RaceDetailPage from "~app/races/[race]/page";

export const revalidate = 0;

interface PageProps {
    params: { username: string };
    searchParams: { [_: string]: string };
}

export default async function Page({ params, searchParams }: PageProps) {
    if (!params || !params.username) throw new Error("Username not found");

    const username: string = params.username as string;

    const tournament = getTournamentNameFromSlug(username);

    if (tournament) {
        if ("guidingTournament" in tournament) {
            return CombinedTournamentPage({
                params: tournament,
                searchParams,
            });
        } else {
            return TournamentPage({
                params: tournament,
                searchParams,
            });
        }
    }

    const race = getImportantRace(username);

    if (race) {
        return RaceDetailPage({ params: { race } });
    }

    const runs = await getUserRuns(username);

    const allRunsRunMap = getRunmap(runs);

    const promises = Array.from(allRunsRunMap.keys()).map((game) => {
        game = game.split("#")[0];
        return getGameGlobal(game);
    });

    const allGlobalGameData = await Promise.all(promises);

    const hasGameTime = !!runs.find((run) => run.hasGameTime);

    let defaultGameTime = hasGameTime;

    if (defaultGameTime) {
        defaultGameTime = !!runs.find((run) => {
            const thisGlobalGameData = allGlobalGameData.find(
                (value: GlobalGameData) => {
                    return value.display === run.game;
                },
            );

            return (
                run.hasGameTime &&
                !!thisGlobalGameData &&
                !thisGlobalGameData.forceRealTime
            );
        });
    }

    const [userData, liveData, raceStats, session] = await Promise.all([
        getGlobalUser(username),
        getLiveRunForUser(username),
        getUserRaceStats(username),
        getSession(),
    ] as const);

    return (
        <UserProfile
            runs={runs}
            username={userData.user}
            hasGameTime={hasGameTime}
            defaultGameTime={defaultGameTime}
            liveData={liveData}
            session={session}
            userData={userData}
            allGlobalGameData={allGlobalGameData}
            raceStats={raceStats}
        />
    );
}

export async function generateStaticParams() {
    return getAllTournamentSlugs().map((tournament) => {
        return { username: tournament };
    });
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const username = params.username;

    if (!username) return buildMetadata();

    return buildMetadata({
        title: username,
        description: `${username} is on The Run! View their games, runs, personal bests, and more.`,
        images: await getUserProfilePhoto(username),
    });
}
