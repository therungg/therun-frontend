import { cacheLife } from 'next/cache';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import { CombinedTournament } from '~app/(new-layout)/tournaments/[tournament]/combined-tournament';
import { liveRunArrayToMap } from '~app/(new-layout)/tournaments/[tournament]/live-run-array-to-map.component';
import {
    getTournamentByName,
    getTournamentStatsByName,
} from '~src/components/tournament/getTournaments';
import { Tournament } from '~src/components/tournament/tournament-info';
import { getLiveRunsForTournament } from '~src/lib/live-runs';
import buildMetadata from '~src/utils/metadata';
import { safeDecodeURI, safeEncodeURI } from '~src/utils/uri';
import { isLiveDataEligibleForTournament } from './is-live-data-eligible-for-tournament.component';

interface PageProps {
    params: { tournaments: string[]; guidingTournament: string };
    searchParams: { [_: string]: string };
}

export const CombinedTournamentPage = async ({
    params,
    searchParams,
}: PageProps) => {
    'use cache';
    cacheLife('minutes');

    if (!params || !params.tournaments) throw new Error('Tournament not found');

    const tournamentNames: string[] = params.tournaments as string[];

    const tab = searchParams.tab ?? 'live';

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

    const stats = (await Promise.all(
        allTournaments.map(async (t) => {
            try {
                return await getTournamentStatsByName(t.name);
            } catch {
                return null;
            }
        }),
    )) as Array<{
        runList?: Array<{
            user: string;
            time: string;
            endedAt: string;
            [k: string]: unknown;
        }>;
        [k: string]: unknown;
    } | null>;

    return (
        <CombinedTournament
            liveDataMap={liveRunArrayToMap(allLiveRuns, 'pb', null)}
            guidingTournament={guidingTournament}
            tournaments={allTournaments}
            stats={stats}
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
    const endString = name.toLowerCase().includes('tournament')
        ? `the ${name}`
        : `the ${name} tournament`;

    return buildMetadata({
        title: name,
        description: `See leaderboards and other statistics for ${endString}!`,
    });
}
