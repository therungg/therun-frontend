import { LiveRun } from '~app/(new-layout)/live/live.types';
import { liveRunArrayToMap } from '~app/(new-layout)/tournaments/[tournament]/live-run-array-to-map.component';
import { GenericTournament } from '~app/(new-layout)/tournaments/[tournament]/tournament';
import { getSession } from '~src/actions/session.action';
import {
    getTournamentByName,
    getTournamentStatsByName,
} from '~src/components/tournament/getTournaments';
import { Tournament } from '~src/components/tournament/tournament-info';
import { getGlobalUser } from '~src/lib/get-global-user';
import { getAllLiveRuns } from '~src/lib/live-runs';
import buildMetadata from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import { isLiveDataEligibleForTournament } from './is-live-data-eligible-for-tournament.component';

export const maxDuration = 60;

interface PageProps {
    params: Promise<{ tournament: string }>;
    searchParams: Promise<{ [_: string]: string }>;
}

const STANDINGS_TOURNAMENT_NAMES = [
    'PACE Fall 2024 Qualifiers 1',
    'PACE Fall 2024 Qualifiers 2',
    'PACE Fall 2024 Qualifiers 3',
];

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
    if (!params || !params.tournament) throw new Error('Tournament not found');

    const tournamentName: string = params.tournament as string;

    const tab = searchParams.tab ?? 'live';

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

    const [stats, qualifierData, standingsTournaments] = await Promise.all([
        safeFetchStats(tournament.name),
        tournament.qualifier
            ? safeFetchTournament(tournament.qualifier)
            : Promise.resolve(null),
        tournament.pointDistribution
            ? Promise.all(STANDINGS_TOURNAMENT_NAMES.map(safeFetchTournament))
            : Promise.resolve(null),
    ]);

    const validStandingsTournaments =
        standingsTournaments?.filter((t): t is Tournament => !!t) ?? null;

    const userPictures = await fetchUserPictures(
        collectTournamentUsernames(
            tournament,
            qualifierData,
            validStandingsTournaments,
            stats,
        ),
    );

    return (
        <GenericTournament
            liveDataMap={liveRunArrayToMap(
                liveData,
                'pb',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tournamentLeaderboards as any,
            )}
            session={session}
            tournament={tournament}
            tab={tab}
            stats={stats}
            qualifierData={qualifierData}
            standingsTournaments={validStandingsTournaments}
            userPictures={userPictures}
        />
    );
};

async function safeFetchStats(name: string) {
    try {
        return await getTournamentStatsByName(name);
    } catch {
        return null;
    }
}

async function safeFetchTournament(name: string) {
    try {
        return await getTournamentByName(name);
    } catch {
        return null;
    }
}

const collectTournamentUsernames = (
    tournament: Tournament,
    qualifierData: Tournament | null,
    standingsTournaments: Tournament[] | null,
    stats: unknown,
): string[] => {
    const usernames = new Set<string>();
    const addLeaderboards = (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lb: any,
    ) => {
        if (!lb) return;
        const arrays = [
            lb.pbLeaderboard,
            lb.attemptCountLeaderboard,
            lb.finishedAttemptCountLeaderboard,
            lb.totalRunTimeLeaderboard,
            lb.uploadLeaderboard,
            lb.completePercentageLeaderboard,
            lb.sumOfBestsLeaderboard,
            lb.consistencyScoreLeaderboard,
        ];
        for (const arr of arrays) {
            if (!Array.isArray(arr)) continue;
            for (const row of arr) {
                if (row?.username) usernames.add(row.username);
            }
        }
    };
    addLeaderboards(tournament.leaderboards);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addLeaderboards((tournament.leaderboards as any)?.gameTime);
    addLeaderboards(qualifierData?.leaderboards);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addLeaderboards((qualifierData?.leaderboards as any)?.gameTime);
    if (standingsTournaments) {
        for (const t of standingsTournaments) {
            addLeaderboards(t.leaderboards);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            addLeaderboards((t.leaderboards as any)?.gameTime);
        }
    }
    const wrHistoryStats = (stats as { wrHistoryStats?: { user: string }[] })
        ?.wrHistoryStats;
    if (Array.isArray(wrHistoryStats)) {
        for (const s of wrHistoryStats) {
            if (s?.user) usernames.add(s.user);
        }
    }
    return [...usernames];
};

const fetchUserPictures = async (
    usernames: string[],
): Promise<Record<string, string>> => {
    if (usernames.length === 0) return {};
    const results = await Promise.all(
        usernames.map(async (username) => {
            try {
                const user = await getGlobalUser(username);
                const picture = user?.picture;
                return [
                    username,
                    picture && picture !== 'noimage' ? picture : '',
                ] as const;
            } catch {
                return [username, ''] as const;
            }
        }),
    );
    const pictures: Record<string, string> = {};
    for (const [username, picture] of results) {
        if (picture) pictures[username] = picture;
    }
    return pictures;
};

export async function generateMetadata(props: PageProps) {
    const params = await props.params;
    const name = safeDecodeURI(params.tournament);
    const endString = name.toLowerCase().includes('tournament')
        ? `the ${name}`
        : `the ${name} tournament`;

    return buildMetadata({
        title: name,
        description: `See leaderboards and other statistics for ${endString}!`,
    });
}
