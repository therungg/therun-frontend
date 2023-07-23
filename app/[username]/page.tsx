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
import buildMetadata from "~src/utils/metadata";
import { getBaseUrl } from "~src/actions/base-url.action";

export const revalidate = 60;

interface PageProps {
    params: { username: string };
    searchParams: { [_: string]: string };
}

export default async function Page({ params, searchParams }: PageProps) {
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
            username={userData.user}
            hasGameTime={hasGameTime}
            defaultGameTime={defaultGameTime}
            liveData={liveData}
            session={session}
            userData={userData}
            allGlobalGameData={allGlobalGameData}
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
    let imageUrl = "";
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

    if (data) {
        imageUrl = data.picture;
    }

    return buildMetadata({
        title: username,
        description: `${username} is on The Run! View their games, runs, personal bests, and more.`,
        images: [
            {
                url: imageUrl,
                secureUrl: imageUrl,
                alt: `Profile photo of ${username}`,
                type: "image/png",
                width: 300,
                height: 300,
            },
        ],
    });
}
