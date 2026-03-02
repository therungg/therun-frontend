import { Panel } from '~app/(new-layout)/components/panel.component';
import {
    type CategoryActivity,
    getCategoryActivityForGame,
    getGameActivity,
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
    const from24h = getDateDaysAgo(1);
    const to = getToday();

    const hotGames = await getGameActivity(from24h, to, 5, 2);

    const categoryMap: Record<number, CategoryActivity[]> = {};
    const categoryResults = await Promise.all(
        hotGames.map((game) =>
            getCategoryActivityForGame(game.gameId, from24h, to, 3),
        ),
    );
    for (let i = 0; i < hotGames.length; i++) {
        categoryMap[hotGames[i].gameId] = categoryResults[i];
    }

    return (
        <Panel
            panelId="trending"
            title="Trending Games"
            subtitle="What's Hot"
            className="p-0 overflow-hidden"
        >
            <TrendingSectionClient
                initialGames={hotGames}
                initialCategoryMap={categoryMap}
            />
        </Panel>
    );
};
