import type { GamePageData } from '../types';
import { LivePanel } from './live-panel';
import { QuickStatsPanel } from './quick-stats-panel';
import { RecentPbsPanel } from './recent-pbs-panel';
import { WrCard } from './wr-card';

interface Props {
    data: GamePageData;
}

export function Sidebar({ data }: Props) {
    return (
        <>
            <WrCard
                rt={data.leaderboardRt}
                gt={data.leaderboardGt}
                category={data.selectedCategory}
                gameSlug={data.game.name}
                subcategoryHash={data.activeFilters.subcategoryHash}
            />
            <LivePanel gameDisplay={data.game.display} />
            <RecentPbsPanel pbs={data.recentPbs} />
            <QuickStatsPanel stats={data.quickStats} />
        </>
    );
}
