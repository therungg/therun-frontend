import {
    getAllActiveRaces,
    getGlobalRaceStats,
    getPaginatedFinishedRaces,
    getRaceGameStats,
} from "~src/lib/races";
import { RaceOverview } from "~app/races/race-overview";
import buildMetadata from "~src/utils/metadata";
import { Metadata } from "next";

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
        title: `Watch upcoming and ongoing speedrun races on therun.gg!`,
        description: `Dashboard for all things speedrun racing - statistics, race history, live races, you name it. All on therun.gg`,
        index: true,
    });
}
