import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { groupCategoryStatsByGame } from '~app/(new-layout)/[username]/(sections)/races/group-category-stats-by-game';
import { UserRaceProfile } from '~app/(new-layout)/[username]/(sections)/races/user-race-profile';
import {
    DetailedUserStats,
    RaceParticipant,
} from '~app/(new-layout)/races/races.types';
import {
    getDetailedUserStats,
    getRaceParticipationsByUser,
    getRacesByIds,
} from '~src/lib/races';
import { getRunnerProfileHead } from '~src/lib/runner-profile';
import buildMetadata from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import { SectionColumns } from '../runner-sidebar';
import { racesStrip, racesStripData } from '../strips/races';
import { resolveStrip } from '../strips/resolve';
import { StripEditor } from '../strips/strip-editor';

interface PageProps {
    params: Promise<{ username: string }>;
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { username } = await params;
    const name = safeDecodeURI(username);
    const head = await getRunnerProfileHead(name);
    if (!head || head.runner.guest) {
        return buildMetadata({ description: 'Runner profile' });
    }
    return buildMetadata({
        title: `${head.runner.name} — Races`,
        description: `${head.runner.name}'s race results and ratings on therun.gg.`,
    });
}

export default async function Page(props: PageProps) {
    const params = await props.params;
    const username = safeDecodeURI(params.username);

    const head = await getRunnerProfileHead(username);
    if (!head || head.runner.guest) notFound();

    const promises = [
        getDetailedUserStats(username),
        getRaceParticipationsByUser(username),
    ];

    const [globalStats, participations] = (await Promise.all(promises)) as [
        DetailedUserStats,
        RaceParticipant[],
    ];

    const initialRaces = await getRacesByIds(
        participations
            .slice(0, 10)
            .map((participation) => participation.raceId),
    );

    // The stats endpoint can answer without a body for users whose stats
    // have not been computed yet, even when they have participations.
    const categoryStatsMap = groupCategoryStatsByGame(
        globalStats?.categoryStats ?? [],
    );

    const raceStats = globalStats?.globalStats;
    const strip = raceStats
        ? resolveStrip(
              racesStrip,
              racesStripData(raceStats),
              head.strips?.races,
          )
        : null;

    return (
        <SectionColumns name={head.runner.name}>
            <UserRaceProfile
                username={username}
                globalStats={globalStats?.globalStats}
                categoryStatsMap={categoryStatsMap}
                participations={participations || []}
                initialRaces={initialRaces}
                stripTiles={strip?.tiles ?? []}
                strip={strip}
                stripEditor={
                    strip ? (
                        <Suspense fallback={null}>
                            <StripEditor
                                name={head.runner.name}
                                strip={strip}
                            />
                        </Suspense>
                    ) : null
                }
            />
        </SectionColumns>
    );
}
