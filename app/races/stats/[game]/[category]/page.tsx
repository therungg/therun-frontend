import {
    getPaginatedFinishedRacesByGame,
    getRaceCategoryStats,
} from "~src/lib/races";
import { CategoryStats } from "~app/races/stats/[game]/[category]/category-stats";

interface PageProps {
    params: { game: string; category: string };
}

export default async function RaceCategoryStatsPage({ params }: PageProps) {
    const categoryStats = await getRaceCategoryStats(
        params.game,
        params.category,
    );

    const recentRaces = await getPaginatedFinishedRacesByGame(1, 5, "", [], {
        game: params.game,
    });

    return (
        <CategoryStats
            categoryStats={categoryStats}
            paginatedRaces={recentRaces}
        />
    );
}
