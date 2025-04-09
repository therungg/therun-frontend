import {
    getMmrLeaderboards,
    getPaginatedFinishedRacesByGame,
    getRaceGameStatsByGame,
    getTimeLeaderboards,
} from "~src/lib/races";
import { GameStats } from "~app/races/stats/[game]/game-stats";
import { Metadata } from "next";
import buildMetadata from "~src/utils/metadata";
import {
    PaginatedRaces,
    RaceGameStatsByGame,
    RaceGameStatsByGameWithCategoryStats,
} from "~app/races/races.types";
import { safeEncodeURI } from "~src/utils/uri";

interface PageProps {
    params: Promise<{ game: string }>;
}

export default async function RaceGameStatsPage(props: PageProps) {
    const params = await props.params;
    const promises = [
        getRaceGameStatsByGame(params.game),
        getPaginatedFinishedRacesByGame(1, 5, "", [], {
            game: params.game,
        }),
    ];

    const [stats, recentRaces] = (await Promise.all(promises)) as [
        RaceGameStatsByGame,
        PaginatedRaces,
    ];

    const timesPromises = stats.categories.map((category) => {
        const categoryName = category.displayValue.split("#")[1];

        return getTimeLeaderboards(
            safeEncodeURI(params.game),
            safeEncodeURI(categoryName),
            1,
            3,
            false,
        );
    });

    const mmrPromises = stats.categories.map((category) => {
        const categoryName = category.displayValue.split("#")[1];

        return getMmrLeaderboards(
            safeEncodeURI(params.game),
            safeEncodeURI(categoryName),
            1,
            3,
        );
    });

    const allPromises = Promise.all([
        Promise.all(timesPromises),
        Promise.all(mmrPromises),
    ]);

    const [categoryTimes, categoryMmrs] = await allPromises;

    stats.categories = stats.categories.map((category, i) => {
        const bestTimes = categoryTimes[i].items;
        const bestMmrs = categoryMmrs[i].items;

        return {
            ...category,
            bestTimes,
            bestMmrs,
        };
    });

    return (
        <GameStats
            stats={stats as RaceGameStatsByGameWithCategoryStats}
            paginatedRaces={recentRaces}
        />
    );
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const params = await props.params;
    const game = params.game;

    if (!game) return buildMetadata();

    const stats = await getRaceGameStatsByGame(game);

    return buildMetadata({
        title: `${stats.stats.displayValue} Race Statistics`,
        description: `So far, ${stats.stats.totalRaces} races have been completed on therun.gg for the game ${stats.stats.displayValue}.`,
        images:
            stats.stats.image && stats.stats.image !== "noimage"
                ? [
                      {
                          url: stats.stats.image,
                          secureUrl: stats.stats.image,
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
