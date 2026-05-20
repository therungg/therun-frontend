import type { GamePageData } from '../types';
import { LivePanel } from './live-panel';
import { QuickStatsPanel } from './quick-stats-panel';
import { RecentPbsPanel } from './recent-pbs-panel';
import { WrCard } from './wr-card';

interface Props {
    data: GamePageData;
}

function buildSubcategoryKey(values: Record<string, string>): string {
    const keys = Object.keys(values).sort();
    return keys.map((k) => `${k}=${values[k]}`).join('|');
}

export function Sidebar({ data }: Props) {
    const subcategoryKey = data.activeFilters.combined
        ? ''
        : buildSubcategoryKey(data.activeFilters.subcategoryValues);
    return (
        <>
            <WrCard
                leaderboard={data.leaderboard}
                category={data.selectedCategory}
                gameSlug={data.game.name}
                subcategoryKey={subcategoryKey}
            />
            <LivePanel gameDisplay={data.game.display} />
            <RecentPbsPanel pbs={data.recentPbs} />
            <QuickStatsPanel stats={data.quickStats} />
        </>
    );
}
