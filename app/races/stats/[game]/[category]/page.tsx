import {
    getMmrLeaderboards,
    getRaceCategoryStats,
    getTimeLeaderboards,
} from "~src/lib/races";
import { CategoryStats } from "~app/races/stats/[game]/[category]/category-stats";
import { Metadata } from "next";
import buildMetadata from "~src/utils/metadata";
import {
    PaginatedRaceMmrStats,
    PaginatedRaceTimeStats,
    RaceGameStatsByCategory,
} from "~app/races/races.types";
import { LeaderboardData } from "~app/races/stats/[game]/[category]/category-leaderboards";

interface PageProps {
    params: { game: string; category: string };
}

export default async function RaceCategoryStatsPage({ params }: PageProps) {
    const monthString = new Date().toISOString().slice(0, 7);

    const promises = [
        getRaceCategoryStats(params.game, params.category),
        getMmrLeaderboards(params.game, params.category),
        getTimeLeaderboards(params.game, params.category, 1, 10, false),
        getTimeLeaderboards(params.game, params.category),
        getTimeLeaderboards(
            params.game,
            params.category,
            1,
            10,
            false,
            monthString,
        ),
        getTimeLeaderboards(
            params.game,
            params.category,
            1,
            10,
            true,
            monthString,
        ),
    ];

    const [
        categoryStats,
        top10Mmr,
        top10TimeUnique,
        top10Time,
        top10TimeThisMonthUnique,
        top10TimeThisMonth,
    ] = (await Promise.all(promises)) as [
        RaceGameStatsByCategory,
        PaginatedRaceMmrStats,
        PaginatedRaceTimeStats,
        PaginatedRaceTimeStats,
        PaginatedRaceTimeStats,
        PaginatedRaceTimeStats,
    ];

    const keys = [
        "top10-month-unique",
        "top10-time",
        "top10-mmr",
        "top10-unique",
        "top10-month",
    ];
    const titles = [
        "Top 10 Players This Month",
        "Top 10 Times This Month",
        "Top 10 Ratings",
        "Top 10 Players All Time",
        "Top 10 Times All Time",
    ];

    const leaderboards = [
        top10TimeThisMonthUnique,
        top10TimeThisMonth,
        top10Mmr,
        top10TimeUnique,
        top10Time,
    ].map((stats, i) => {
        return {
            items: stats.items,
            key: keys[i],
            title: titles[i],
        };
    }) as LeaderboardData[];

    return (
        <CategoryStats
            categoryStats={categoryStats as RaceGameStatsByCategory}
            leaderboards={leaderboards}
        />
    );
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const gameName = params.game;
    const categoryName = params.category;

    if (!gameName || !categoryName) return buildMetadata();

    const categoryStats = await getRaceCategoryStats(gameName, categoryName);

    const [game, category] = categoryStats.stats.displayValue.split("#");

    return buildMetadata({
        title: `Speedrun race statistics for ${game} - ${category} on therun.gg`,
        description: `So far, ${categoryStats.stats.totalRaces} races have been completed on therun.gg for ${game} - ${category}.`,
        images:
            categoryStats.stats.image && categoryStats.stats.image !== "noimage"
                ? [
                      {
                          url: categoryStats.stats.image,
                          secureUrl: categoryStats.stats.image,
                          alt: `Game image of ${game}`,
                          type: "image/png",
                          width: 300,
                          height: 300,
                      },
                  ]
                : undefined,
        index: true,
    });
}
