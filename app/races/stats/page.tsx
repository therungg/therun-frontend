import { getGlobalRaceStats, getRaceGameStats } from "~src/lib/races";
import { GameStats, GlobalStats } from "~app/races/races.types";
import { RaceStats } from "~app/races/stats/race-stats";

export default async function RaceStatsPage() {
    const promises = [getGlobalRaceStats(), getRaceGameStats(0)];

    const [globalRaceStats, gameStats]: [GlobalStats, GameStats[]] =
        (await Promise.all(promises)) as [GlobalStats, GameStats[]];

    return (
        <RaceStats
            globalRaceStats={globalRaceStats}
            globalGameStats={gameStats}
        />
    );
}
