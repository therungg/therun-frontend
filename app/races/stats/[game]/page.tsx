import { getRaceGameStatsByGame } from "~src/lib/races";

interface PageProps {
    params: { game: string };
}

export default async function RaceGameStatsPage({ params }: PageProps) {
    const stats = await getRaceGameStatsByGame(params.game);

    return <div>{JSON.stringify(stats)}</div>;
}
