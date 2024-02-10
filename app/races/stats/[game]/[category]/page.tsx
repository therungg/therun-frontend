import { getRaceCategoryStats } from "~src/lib/races";

interface PageProps {
    params: { game: string; category: string };
}

export default async function RaceCategoryStatsPage({ params }: PageProps) {
    const categoryStats = await getRaceCategoryStats(
        params.game,
        params.category,
    );

    return <div>{categoryStats.users.length}</div>;
}
