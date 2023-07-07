import { Tournament } from "~src/components/tournament/tournament-info";
import { getTournamentByName } from "~src/components/tournament/getTournaments";
import { LiveRun } from "~app/live/live.types";
import { getLiveRunsForGameCategory } from "~src/lib/live-runs";
import { isLiveDataEligibleForTournament } from "./is-live-data-eligible-for-tournament.component";
import { GenericTournament } from "~app/tournaments/[tournament]/tournament";
import { getSession } from "~src/actions/session.action";
import { liveRunArrayToMap } from "~app/tournaments/[tournament]/live-run-array-to-map.component";

export default async function Page({
    params,
    searchParams,
}: {
    params: { tournament: string };
    searchParams: { [_: string]: string };
}) {
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

    let liveData: LiveRun[] = await getLiveRunsForGameCategory(
        tournament.game,
        tournament.category
    );

    liveData = liveData.filter((data) =>
        isLiveDataEligibleForTournament(data, tournament)
    );

    let tournamentLeaderboards = null;

    if (tournament.leaderboards) {
        tournamentLeaderboards =
            tournament.gameTime && tournament.leaderboards.gameTime
                ? tournament.leaderboards.gameTime
                : tournament.leaderboards;
    }

    const session = await getSession();

    return (
        <GenericTournament
            liveDataMap={liveRunArrayToMap(
                liveData,
                "pb",
                tournamentLeaderboards
            )}
            session={session}
            tournament={tournament}
            tab={tab}
        />
    );
};
