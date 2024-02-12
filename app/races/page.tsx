import {
    getAllActiveRaces,
    getGlobalRaceStats,
    getPaginatedFinishedRaces,
    getRaceGameStats,
} from "~src/lib/races";
import { RaceOverview } from "~app/races/race-overview";
import {
    GameStats,
    GlobalStats,
    PaginatedRaces,
    Race,
} from "~app/races/races.types";
import buildMetadata from "~src/utils/metadata";
import { Metadata } from "next";

export default async function RacePage() {
    const promises = [
        getAllActiveRaces(),
        getPaginatedFinishedRaces(1, 3),
        getGlobalRaceStats(),
        getRaceGameStats(3),
    ];

    const [races, finishedRaces, globalRaceStats, gameStats]: [
        Race[],
        PaginatedRaces,
        GlobalStats,
        GameStats[],
    ] = (await Promise.all(promises)) as [
        Race[],
        PaginatedRaces,
        GlobalStats,
        GameStats[],
    ];

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
