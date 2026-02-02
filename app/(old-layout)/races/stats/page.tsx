import { Metadata } from 'next';
import { GameStats, GlobalStats } from '~app/(old-layout)/races/races.types';
import { RaceStats } from '~app/(old-layout)/races/stats/race-stats';
import { getGlobalRaceStats, getRaceGameStats } from '~src/lib/races';
import buildMetadata from '~src/utils/metadata';

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
    const raceGameStats = await getRaceGameStats(1);

    return buildMetadata({
        title: `Race Statistics`,
        description: `The most popular speedrun game on therun.gg is ${
            raceGameStats ? raceGameStats[0].displayValue : 'unknown'
        } with a total of ${
            raceGameStats ? raceGameStats[0].totalRaces : '0'
        } races completed. Come join in on the fun!`,
        index: true,
    });
}
