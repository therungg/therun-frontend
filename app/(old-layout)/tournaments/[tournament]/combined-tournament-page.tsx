import { Tournament } from "~src/components/tournament/tournament-info";
import { getTournamentByName } from "~src/components/tournament/getTournaments";
import { LiveRun } from "~app/(old-layout)/live/live.types";
import { getLiveRunsForTournament } from "~src/lib/live-runs";
import { isLiveDataEligibleForTournament } from "./is-live-data-eligible-for-tournament.component";
import { liveRunArrayToMap } from "~app/(old-layout)/tournaments/[tournament]/live-run-array-to-map.component";
import buildMetadata from "~src/utils/metadata";
import { safeDecodeURI, safeEncodeURI } from "~src/utils/uri";
import { CombinedTournament } from "~app/(old-layout)/tournaments/[tournament]/combined-tournament";

export const revalidate = 30;

interface PageProps {
    params: { tournaments: string[]; guidingTournament: string };
    searchParams: { [_: string]: string };
}

export const CombinedTournamentPage = async ({
    params,
    searchParams,
}: PageProps) => {
    if (!params || !params.tournaments) throw new Error("Tournament not found");

    const tournamentNames: string[] = params.tournaments as string[];

    const tab = searchParams.tab ?? "live";

    const guidingTournament: Tournament = await getTournamentByName(
        params.guidingTournament,
    );

    const tournamentPromises = tournamentNames.map((tournamentName) =>
        getTournamentData(tournamentName),
    );
    const allTournamentData: { tournament: Tournament; liveData: LiveRun[] }[] =
        await Promise.all(tournamentPromises);

    const allTournaments = allTournamentData.map(
        (tournamentData) => tournamentData.tournament,
    );

    const allLiveRuns = allTournamentData
        .map((tournamentData) => tournamentData.liveData)
        .flat();

    return (
        <CombinedTournament
            liveDataMap={liveRunArrayToMap(allLiveRuns, "pb", null)}
            guidingTournament={guidingTournament}
            tournaments={allTournaments}
            tab={tab}
        />
    );
};

const getTournamentData = async (
    tournamentName: string,
): Promise<{ tournament: Tournament; liveData: LiveRun[] }> => {
    const tournament: Tournament = await getTournamentByName(
        safeEncodeURI(tournamentName),
    );

    tournament.game = tournament.eligibleRuns[0].game;
    tournament.category = tournament.eligibleRuns[0].category;

    let liveData: LiveRun[] = await getLiveRunsForTournament(tournament);

    liveData = liveData.filter((data) =>
        isLiveDataEligibleForTournament(data, tournament),
    );

    return { tournament, liveData };
};

export async function generateMetadata({ params }: PageProps) {
    const name = safeDecodeURI(params.tournament);
    const endString = name.toLowerCase().includes("tournament")
        ? `the ${name}`
        : `the ${name} tournament`;

    return buildMetadata({
        title: name,
        description: `See leaderboards and other statistics for ${endString}!`,
    });
}
