import { Metadata } from 'next';
import { GlobalGameData } from '~app/(old-layout)/[username]/[game]/[run]/run';
import { getRunmap } from '~app/(old-layout)/[username]/runmap.component';
import { UserProfile } from '~app/(old-layout)/[username]/user-profile';
import { CombinedTournamentPage } from '~app/(old-layout)/tournaments/[tournament]/combined-tournament-page';
import { TournamentPage } from '~app/(old-layout)/tournaments/[tournament]/page';
import { getTournamentNameFromSlug } from '~app/(old-layout)/tournaments/tournament-list';
import { getSession } from '~src/actions/session.action';
import { getGameGlobal } from '~src/components/game/get-game';
import { JsonLd } from '~src/components/json-ld';
import { getGlobalUser } from '~src/lib/get-global-user';
import { getUserRuns } from '~src/lib/get-user-runs';
import { getLiveRunForUser } from '~src/lib/live-runs';
import { getUserRaceStats } from '~src/lib/races';
import {
    buildPersonJsonLd,
    formatMillis,
    formatPlaytime,
} from '~src/utils/json-ld';
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

    // Find favorite game+category by total playtime
    const favoriteRun =
        runs.length > 0
            ? runs.reduce((best, run) => {
                  const time = parseInt(run.totalRunTime) || 0;
                  const bestTime = parseInt(best.totalRunTime) || 0;
                  return time > bestTime ? run : best;
              })
            : undefined;

    const totalPlaytimeMs = runs.reduce(
        (sum, run) => sum + (parseInt(run.totalRunTime) || 0),
        0,
    );
    const totalAttempts = runs.reduce(
        (sum, run) => sum + (run.attemptCount || 0),
        0,
    );

    const descParts = [`${userData.user} is a speedrunner on The Run`];
    if (favoriteRun) {
        const favPb = formatMillis(favoriteRun.personalBest);
        const favLabel = `${favoriteRun.game} - ${favoriteRun.run}`;
        descParts.push(
            `Favorite game: ${favLabel}${favPb ? ` (PB: ${favPb})` : ''}`,
        );
    }
    if (totalAttempts > 0)
        descParts.push(`${totalAttempts.toLocaleString()} total attempts`);
    const playtime = formatPlaytime(String(totalPlaytimeMs));
    if (playtime) descParts.push(`${playtime} total playtime`);
    const profileDescription = descParts.join(' | ');

    return (
        <>
            <JsonLd
                data={buildPersonJsonLd({
                    username: userData.user,
                    picture: userData.picture,
                    description: profileDescription,
                    socials: userData.socials,
                })}
            />
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
        </>
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

    const [runs, images] = await Promise.all([
        getUserRuns(username),
        getUserProfilePhoto(username),
    ]);

    const allRuns = runs || [];
    const favoriteRun =
        allRuns.length > 0
            ? allRuns.reduce((best, run) => {
                  const time = parseInt(run.totalRunTime) || 0;
                  const bestTime = parseInt(best.totalRunTime) || 0;
                  return time > bestTime ? run : best;
              })
            : undefined;

    const totalAttempts = allRuns.reduce(
        (sum, run) => sum + (run.attemptCount || 0),
        0,
    );
    const totalPlaytimeMs = allRuns.reduce(
        (sum, run) => sum + (parseInt(run.totalRunTime) || 0),
        0,
    );

    const descParts = [`${username}'s speedrun stats`];
    if (favoriteRun) {
        const favPb = formatMillis(favoriteRun.personalBest);
        const favLabel = `${favoriteRun.game} - ${favoriteRun.run}`;
        descParts.push(
            `Favorite: ${favLabel}${favPb ? ` (PB: ${favPb})` : ''}`,
        );
    }
    if (totalAttempts > 0)
        descParts.push(`${totalAttempts.toLocaleString()} attempts`);
    const playtime = formatPlaytime(String(totalPlaytimeMs));
    if (playtime) descParts.push(`${playtime} played`);

    return buildMetadata({
        title: username,
        description: descParts.join(' | '),
        images,
    });
}
