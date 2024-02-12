import {
    getPaginatedFinishedRacesByGame,
    getRaceGameStatsByGame,
} from "~src/lib/races";
import { GameStats } from "~app/races/stats/[game]/game-stats";
import { Metadata } from "next";
import buildMetadata from "~src/utils/metadata";

interface PageProps {
    params: { game: string };
}

export default async function RaceGameStatsPage({ params }: PageProps) {
    const stats = await getRaceGameStatsByGame(params.game);
    const recentRaces = await getPaginatedFinishedRacesByGame(1, 5, "", [], {
        game: params.game,
    });

    return <GameStats stats={stats} paginatedRaces={recentRaces} />;
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const game = params.game;

    if (!game) return buildMetadata();

    const stats = await getRaceGameStatsByGame(game);

    return buildMetadata({
        title: `Speedrun race statistics for ${stats.stats.displayValue} on therun.gg`,
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
