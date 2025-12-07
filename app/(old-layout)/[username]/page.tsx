import { Metadata } from 'next';
import { GlobalGameData } from '~app/(old-layout)/[username]/[game]/[run]/run';
import { getRunmap } from '~app/(old-layout)/[username]/runmap.component';
import { UserProfile } from '~app/(old-layout)/[username]/user-profile';
import { CombinedTournamentPage } from '~app/(old-layout)/tournaments/[tournament]/combined-tournament-page';
import { TournamentPage } from '~app/(old-layout)/tournaments/[tournament]/page';
import {
    getAllTournamentSlugs,
    getTournamentNameFromSlug,
} from '~app/(old-layout)/tournaments/tournament-list';
import { getSession } from '~src/actions/session.action';
import { getGameGlobal } from '~src/components/game/get-game';
import { getGlobalUser } from '~src/lib/get-global-user';
import { getUserRuns } from '~src/lib/get-user-runs';
import { getLiveRunForUser } from '~src/lib/live-runs';
import { getUserRaceStats } from '~src/lib/races';
import buildMetadata, { getUserProfilePhoto } from '~src/utils/metadata';

interface PageProps {
    params: Promise<{ username: string }>;
    searchParams: Promise<{ [_: string]: string }>;
}

export default async function Page(props: PageProps) {
    const searchParams = await props.searchParams;
    const params = await props.params;
    if (!params || !params.username) throw new Error('Username not found');

    const username: string = params.username as string;

    const tournament = getTournamentNameFromSlug(username);

    if (tournament) {
        if ('guidingTournament' in tournament) {
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

    const runs = (await getUserRuns(username)) || [];

    const allRunsRunMap = getRunmap(runs);

    const promises = Array.from(allRunsRunMap.keys()).map((game) => {
        game = game.split('#')[0];
        return getGameGlobal(game);
    });

    const allGlobalGameData = await Promise.all(promises);

    const hasGameTime = !!(runs || []).find((run) => run.hasGameTime);

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

export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const params = await props.params;
    const username = params.username;

    if (!username) return buildMetadata();

    const tournament = getTournamentNameFromSlug(username);

    if (tournament) {
        return buildMetadata({
            title: 'Speedrun tournament ' + tournament,
            description: 'Speedrun tournament ' + tournament,
        });
    }

    return buildMetadata({
        title: username,
        description: `${username} is on The Run! View their games, runs, personal bests, and more.`,
        images: await getUserProfilePhoto(username),
    });
}
