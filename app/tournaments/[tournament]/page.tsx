import { Tournament } from "~src/components/tournament/tournament-info";
import { getTournamentByName } from "~src/components/tournament/getTournaments";
import { LiveRun } from "~app/live/live.types";
import { getAllLiveRuns } from "~src/lib/live-runs";
import { isLiveDataEligibleForTournament } from "./is-live-data-eligible-for-tournament.component";
import { GenericTournament } from "~app/tournaments/[tournament]/tournament";
import { getSession } from "~src/actions/session.action";
import { liveRunArrayToMap } from "~app/tournaments/[tournament]/live-run-array-to-map.component";
import buildMetadata from "~src/utils/metadata";
import { safeDecodeURI } from "~src/utils/uri";
import { getRaceByRaceId } from "~src/lib/races";

export const revalidate = 30;
// Increase Tournament Page timeout to 60 seconds since some endpoints are a touch slow at the moment
export const maxDuration = 60;

interface PageProps {
    params: Promise<{ tournament: string }>;
    searchParams: Promise<{ [_: string]: string }>;
}

export default async function Page(props: PageProps) {
    const searchParams = await props.searchParams;
    const params = await props.params;
    return TournamentPage({ params, searchParams });
}

export const TournamentPage = async ({
    params,
    searchParams,
}: {
    params: { tournament: string };
    searchParams: { [_: string]: string };
}) => {
    if (!params || !params.tournament) throw new Error("Tournament not found");

    const tournamentName: string = params.tournament as string;

    const tab = searchParams.tab ?? "live";

    const tournament: Tournament = await getTournamentByName(tournamentName);

    tournament.game = tournament.eligibleRuns[0].game;
    tournament.category = tournament.eligibleRuns[0].category;

    let liveData: LiveRun[] = await getAllLiveRuns(tournament.game);

    liveData = liveData.filter((data) =>
        isLiveDataEligibleForTournament(data, tournament),
    );

    let tournamentLeaderboards = null;

    if (tournament.leaderboards) {
        tournamentLeaderboards =
            tournament.gameTime && tournament.leaderboards.gameTime
                ? tournament.leaderboards.gameTime
                : tournament.leaderboards;
    }

    const session = await getSession();

    let race = undefined;

    if (tournament.raceId) {
        race = await getRaceByRaceId(tournament.raceId);
    }

    return (
        <GenericTournament
            liveDataMap={liveRunArrayToMap(
                liveData,
                "pb",
                tournamentLeaderboards,
            )}
            session={session}
            tournament={tournament}
            tab={tab}
            race={race}
        />
    );
};

export async function generateMetadata(props: PageProps) {
    const params = await props.params;
    const name = safeDecodeURI(params.tournament);
    const endString = name.toLowerCase().includes("tournament")
        ? `the ${name}`
        : `the ${name} tournament`;

    return buildMetadata({
        title: name,
        description: `See leaderboards and other statistics for ${endString}!`,
    });
}
