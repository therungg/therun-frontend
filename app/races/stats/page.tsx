import { getGlobalRaceStats, getRaceGameStats } from "~src/lib/races";
import { GameStats, GlobalStats } from "~app/races/races.types";
import { RaceStats } from "~app/races/stats/race-stats";
import { Metadata } from "next";
import buildMetadata from "~src/utils/metadata";

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

export async function generateMetadata(): Promise<Metadata> {
    const globalRaceStats = await getGlobalRaceStats();
    const raceGameStats = await getRaceGameStats(1);

    return buildMetadata({
        title: `Statistics for speedrun races on therun.gg. So far, ${globalRaceStats.totalRaces} have been completed!`,
        description: `The most popular speedrun game on therun.gg is ${
            raceGameStats ? raceGameStats[0].displayValue : "unknown"
        } with a total of ${
            raceGameStats ? raceGameStats[0].totalRaces : "0"
        } races completed. Come join in on the fun!`,
        index: true,
    });
}
