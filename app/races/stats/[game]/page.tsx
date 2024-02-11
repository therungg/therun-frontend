import {
    getPaginatedFinishedRacesByGame,
    getRaceGameStatsByGame,
} from "~src/lib/races";
import { GameStats } from "~app/races/stats/[game]/game-stats";

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
