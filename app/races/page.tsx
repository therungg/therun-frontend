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

export default async function RacePage() {
    const promises = [
        getAllActiveRaces(),
        getPaginatedFinishedRaces(1, 9),
        getGlobalRaceStats(),
        getRaceGameStats(),
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
