import { Panel } from '~app/(new-layout)/components/panel.component';
import {
    type CategoryActivity,
    type GameActivity,
    type GameWithImage,
    getCategoryActivityForGame,
    getGameActivity,
    getTopGames,
} from '~src/lib/highlights';
import { TrendingSectionClient } from './trending-section-client';

function getDateDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

function getToday(): string {
    return new Date().toISOString().split('T')[0];
}

export const TrendingSection = async () => {
    const from7d = getDateDaysAgo(7);
    const to = getToday();

    const [hotGames, allTimeGames] = await Promise.all([
        getGameActivity(from7d, to, 6, 3),
        getTopGames(5),
    ]);

    // Fetch top 2 categories for each hot game in parallel
    const categoryMap: Record<number, CategoryActivity[]> = {};
    const categoryResults = await Promise.all(
        hotGames.map((game) =>
            getCategoryActivityForGame(game.gameId, from7d, to, 2),
        ),
    );
    for (let i = 0; i < hotGames.length; i++) {
        categoryMap[hotGames[i].gameId] = categoryResults[i];
    }

    return (
        <Panel
            title="Trending Games"
            subtitle="What's Hot"
            className="p-0 overflow-hidden"
        >
            <TrendingSectionClient
                initialGames={hotGames}
                initialCategoryMap={categoryMap}
                allTimeGames={allTimeGames}
            />
        </Panel>
    );
};
