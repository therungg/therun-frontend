import {
    getPaginatedFinishedRacesByGame,
    getRaceCategoryStats,
} from "~src/lib/races";
import { CategoryStats } from "~app/races/stats/[game]/[category]/category-stats";
import { Metadata } from "next";
import buildMetadata from "~src/utils/metadata";

interface PageProps {
    params: { game: string; category: string };
}

export default async function RaceCategoryStatsPage({ params }: PageProps) {
    const categoryStats = await getRaceCategoryStats(
        params.game,
        params.category,
    );

    const recentRaces = await getPaginatedFinishedRacesByGame(1, 10, "", [], {
        game: params.game,
    });

    return (
        <CategoryStats
            categoryStats={categoryStats}
            paginatedRaces={recentRaces}
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
