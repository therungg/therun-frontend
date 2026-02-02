import { Metadata } from 'next';
import { RaceOverview } from '~app/(old-layout)/races/race-overview';
import {
    getAllActiveRaces,
    getGlobalRaceStats,
    getPaginatedFinishedRaces,
    getRaceGameStats,
} from '~src/lib/races';
import buildMetadata from '~src/utils/metadata';

export default async function RacePage() {
    const promises = [
        getAllActiveRaces(),
        getPaginatedFinishedRaces(1, 3),
        getGlobalRaceStats(),
        getRaceGameStats(3),
    ] as const;

    const [races, finishedRaces, globalRaceStats, gameStats] =
        await Promise.all(promises);

    return (
        <RaceOverview
            races={races}
            finishedRaces={finishedRaces}
            globalRaceStats={globalRaceStats}
            globalGameStats={gameStats}
        />
    );
}

export async function generateMetadata(): Promise<Metadata> {
    return buildMetadata({
        title: `Races`,
        description: `Dashboard for all things speedrun racing - statistics, race history, live races, you name it. All on therun.gg`,
        index: true,
    });
}
